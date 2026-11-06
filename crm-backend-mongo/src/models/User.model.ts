import {
  Schema,
  model,
  Types,
} from 'mongoose';

import {
  ROLES,
  RoleName,
} from '@/utils/permissions';

import {
  THEME_PRESETS,
  COLOR_MODES,
  type ThemePreset,
  type ColorMode,
} from '@/models/Company.model';

export type { RoleName };

/* ============================================================
   AUTH PROVIDER
============================================================ */

export type AuthProvider =
  | 'LOCAL'
  | 'GOOGLE';

/* ============================================================
   USER DOCUMENT
============================================================ */

export interface UserDoc {
  _id: Types.ObjectId;

  companyId: Types.ObjectId;

  name: string;

  email: string;

  passwordHash?: string;

  googleId?: string;

  authProvider: AuthProvider;

  avatar?: string;

  role: RoleName;

  isActive: boolean;

  lastLoginAt?: Date;

  /**
   * Personal appearance preferences. null = follow the
   * company/role theme. themePreset is only honoured when the
   * company allows user themes.
   */
  preferences: {
    themePreset: ThemePreset | null;
    colorMode: ColorMode | null;
  };

  createdAt: Date;

  updatedAt: Date;
}

/* ============================================================
   USER SCHEMA
============================================================ */

const userSchema =
  new Schema<UserDoc>(
    {
      /* ------------------------------------------------------
         COMPANY
      ------------------------------------------------------ */

      companyId: {
        type: Schema.Types.ObjectId,
        ref: 'Company',
        required: true,
        index: true,
      },

      /* ------------------------------------------------------
         NAME
      ------------------------------------------------------ */

      name: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 100,
      },

      /* ------------------------------------------------------
         EMAIL
      ------------------------------------------------------ */

      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        minlength: 5,
        maxlength: 254,
      },

      /* ------------------------------------------------------
         PASSWORD
      ------------------------------------------------------ */

      passwordHash: {
        type: String,
        required: false,
        select: false,
      },

      /* ------------------------------------------------------
         GOOGLE ID
      ------------------------------------------------------ */

      googleId: {
        type: String,
        required: false,
        unique: true,
        sparse: true,
        trim: true,
      },

      /* ------------------------------------------------------
         AUTH PROVIDER
      ------------------------------------------------------ */

      authProvider: {
        type: String,
        enum: [
          'LOCAL',
          'GOOGLE',
        ],
        default: 'LOCAL',
        required: true,
      },

      /* ------------------------------------------------------
         AVATAR
      ------------------------------------------------------ */

      avatar: {
        type: String,
        required: false,
        trim: true,
      },

      /* ------------------------------------------------------
         ROLE
      ------------------------------------------------------ */

      role: {
        type: String,
        enum: ROLES,
        default: 'OWNER',
        required: true,
      },

      /* ------------------------------------------------------
         ACTIVE STATUS
      ------------------------------------------------------ */

      isActive: {
        type: Boolean,
        default: true,
      },

      /* ------------------------------------------------------
         LAST LOGIN
      ------------------------------------------------------ */

      lastLoginAt: {
        type: Date,
        required: false,
      },

      /* ------------------------------------------------------
         APPEARANCE PREFERENCES
      ------------------------------------------------------ */

      preferences: {
        themePreset: {
          type: String,
          enum: [...THEME_PRESETS, null],
          default: null,
        },
        colorMode: {
          type: String,
          enum: [...COLOR_MODES, null],
          default: null,
        },
      },
    },
    {
      timestamps: true,
    },
  );

/* ============================================================
   AUTHENTICATION VALIDATION
============================================================ */

userSchema.pre(
  'validate',
  function (next) {
    /* --------------------------------------------------------
       LOCAL ACCOUNT
    -------------------------------------------------------- */

    // passwordHash is select:false, so it is absent on ordinary
    // reads. Only enforce it when creating the user or when the
    // auth fields themselves change.
    const authFieldsChanged =
      this.isNew ||
      this.isModified('passwordHash') ||
      this.isModified('authProvider');

    if (
      authFieldsChanged &&
      this.authProvider === 'LOCAL' &&
      !this.passwordHash
    ) {
      this.invalidate(
        'passwordHash',
        'Password is required for local authentication.',
      );
    }

    /* --------------------------------------------------------
       GOOGLE ACCOUNT
    -------------------------------------------------------- */

    if (
      authFieldsChanged &&
      this.authProvider === 'GOOGLE' &&
      !this.googleId
    ) {
      this.invalidate(
        'googleId',
        'Google ID is required for Google authentication.',
      );
    }

    next();
  },
);

/* ============================================================
   NORMALIZE EMAIL
============================================================ */

userSchema.pre(
  'save',
  function (next) {
    if (this.email) {
      this.email =
        this.email
          .trim()
          .toLowerCase();
    }

    next();
  },
);

/* ============================================================
   JSON TRANSFORM
============================================================ */

const transform = (
  _doc: unknown,
  ret: Record<string, any>,
) => {
  if (ret._id) {
    ret.id =
      ret._id.toString();
  }

  delete ret._id;

  /*
   * Never expose password hash.
   */
  delete ret.passwordHash;

  /*
   * Never expose MongoDB version.
   */
  delete ret.__v;

  return ret;
};

userSchema.set(
  'toJSON',
  {
    virtuals: true,
    versionKey: false,
    transform,
  },
);

userSchema.set(
  'toObject',
  {
    virtuals: true,
    versionKey: false,
    transform,
  },
);

/* ============================================================
   MODEL
============================================================ */

export const User =
  model<UserDoc>(
    'User',
    userSchema,
  );