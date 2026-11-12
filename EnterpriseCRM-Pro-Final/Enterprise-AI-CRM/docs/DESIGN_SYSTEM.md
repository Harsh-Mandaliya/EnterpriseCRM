# Design system — motion, forms, charts

The app's visual language is built from small shared pieces so every screen looks and behaves the same. All colours come from the active theme (see [THEMING.md](THEMING.md)), so company branding, role themes and dark mode apply everywhere.

## Motion (`src/components/motion`)

| Piece | Use |
|---|---|
| `motion.ts` | Durations (`fast` 160 ms, `base` 260, `slow` 420, `count` 900), easings, stagger (55 ms), `useReducedMotion()` |
| `FadeInView` | Fade + slide-in on mount; pass `index` to stagger list items |
| `PressableScale` | Pressable that scales to 97% while pressed |
| `AnimatedNumber` | Counts up to a value; `formatCompactCurrency` → ₹950 / ₹42K / ₹4.2L / ₹1.3Cr |
| `Skeleton`, `SkeletonCard` | Pulsing placeholders while loading |

Every animation checks the OS **reduce motion** setting and renders the final state instantly when it is on. Native-driver animations are used where possible (not on web).

## Graphics & charts

| Piece | Use |
|---|---|
| `graphics/HeroHeader` | Gradient header (primary → accent) with slowly floating shapes, back button, title, subtitle, icon, right-side action |
| `screens/auth/components/AuthLayout` | Animated gradient sign-in shell; side panel on screens ≥1024 px wide |
| `charts/BarChart` | Bars grow in, value labels, accessible summary |
| `charts/DonutChart` | Sweeps in, centre value, legend |
| `charts/FunnelChart` | Step bars with "% continue" between steps |
| `charts/Sparkline` | Small trend line with gradient fill |
| `common/Fab` | Pop-in floating create button — render only when the role may create |

SVG gradient ids come from `useSvgId()` so two mounted screens never share an id (on web that made headers blank).

## Forms (`src/components/form`, `src/hooks/useForm.ts`)

```tsx
const form = useForm(initialValues, { name: rules.minLength('Name', 1), email: rules.email });
const submit = form.handleSubmit(async values => { await api(values); navigation.goBack(); });

<FormScreen title="New lead" icon="person-add-outline" onBack={navigation.goBack}
  submitLabel="Create lead" onSubmit={submit} submitting={form.submitting}
  error={form.formError} completion={form.completion}>
  <FormSection title="Contact" icon="person-outline">
    <InputField label="Name" required value={form.values.name}
      onChangeText={v => form.setField('name', v)} onBlur={() => form.touch('name')}
      error={form.errorFor('name')} />
  </FormSection>
</FormScreen>
```

- Errors show after a field is left or on submit; server validation errors are mapped back onto fields.
- `completion` drives the progress bar under the header (green when complete).
- Fields: `InputField` (icon, prefix, suffix, multiline), `ChoiceField` (chips with icons/colours), `PickerField` (searchable bottom sheet), `DateField` (quick choices + YYYY-MM-DD / HH:MM), `StepperField`, `SwitchField`, `InfoRow`.
- Picker data comes from `usePickerData()`, which calls the API — lists are already limited to what the user may see.
- Role-aware fields use `useCan()` from `src/utils/permissions.ts` (a mirror of the server rules for UX only).

## Screens built on the kit

Login · Register · Forgot / Reset password · Lead · Deal · Task · Customer · Product · Invoice · Payment · Calendar event · Alerts · Pipeline · Analytics · Theme & branding · Teams.

## Accessibility

Inputs have labels and hints, choice chips use radio semantics, pickers announce the selection, charts expose a text summary, errors are live regions, touch targets are ≥ 40 px, and colours meet the contrast checks in `buildTheme.test.ts`.
