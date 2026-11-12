import React, {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import type {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { convertLead, getLead } from '@/api/leads.api';
import { getApiErrorMessage } from '@/api/client';
import { confirmAction } from '@/utils/confirm';
import { LeadConvertCard } from '@/screens/leads/components/LeadConvertCard';

import {
  useAppDispatch,
} from '@/hooks/useRedux';

import {
  changeLeadStatus,
} from '@/redux/slices/leadsSlice';

import {
  colors,
} from '@/theme/colors';

import {
  typography,
  spacing,
  radius,
} from '@/theme/typography';

import type {
  ConvertLeadResult,
  Lead,
  LeadStatus,
} from '@/types';

import type {
  MainStackParamList,
} from '@/navigation/OwnerNavigator';


import { createThemedStyles } from '@/theme/themeStore';
/* ============================================================
   TYPES
============================================================ */

type Props =
  NativeStackScreenProps<
    MainStackParamList,
    'LeadDetail'
  >;


/* ============================================================
   LEAD STAGES
============================================================ */

const STAGES: {
  value: LeadStatus;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    value: 'NEW',
    label: 'New',
    icon: 'add-circle-outline',
  },
  {
    value: 'CONTACTED',
    label: 'Contacted',
    icon: 'call-outline',
  },
  {
    value: 'QUALIFIED',
    label: 'Qualified',
    icon: 'checkmark-circle-outline',
  },
  {
    value: 'CONVERTED',
    label: 'Converted',
    icon: 'trophy-outline',
  },
  {
    value: 'LOST',
    label: 'Lost',
    icon: 'close-circle-outline',
  },
];


/* ============================================================
   HELPERS
============================================================ */

function formatSource(
  source: string,
): string {
  return source
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(
      /\b\w/g,
      char => char.toUpperCase(),
    );
}


function formatStatus(
  status: LeadStatus,
): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(
      /\b\w/g,
      char => char.toUpperCase(),
    );
}


function getStatusColor(
  status: LeadStatus,
): string {
  switch (status) {
    case 'NEW':
      return colors.status.new;

    case 'CONTACTED':
      return colors.status.contacted;

    case 'QUALIFIED':
      return colors.status.qualified;

    case 'CONVERTED':
      return colors.success;

    case 'LOST':
      return colors.status.lost;

    default:
      return colors.textMuted;
  }
}


/* ============================================================
   MAIN SCREEN
============================================================ */

export function LeadDetailScreen({
  route,
  navigation,
}: Props) {
  const { leadId } = route.params;

  const dispatch = useAppDispatch();

  const { width } =
    useWindowDimensions();

  const [
    lead,
    setLead,
  ] = useState<Lead | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    updating,
    setUpdating,
  ] = useState(false);

  const [
    convertError,
    setConvertError,
  ] = useState<string | null>(null);


  const isTablet =
    width >= 768;

  const isDesktop =
    width >= 1100;

  const contentWidth =
    isDesktop
      ? 980
      : isTablet
        ? 760
        : undefined;


  /* ==========================================================
     LOAD LEAD
  ========================================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadLead() {
      try {
        setLoading(true);

        const data =
          await getLead(leadId);

        if (!cancelled) {
          setLead(data);
        }
      } catch {
        if (!cancelled) {
          setLead(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLead();

    return () => {
      cancelled = true;
    };
  }, [leadId]);


  /* ==========================================================
     CHANGE STAGE
  ========================================================== */

  /* ==========================================================
     CONVERSION
  ========================================================== */

  function openCustomer(
    customerId: string,
    customerName: string,
  ) {
    navigation.navigate('CustomerDetail', {
      customerId,
      customerName,
    });
  }

  function handleConverted(
    result: ConvertLeadResult,
  ) {
    setConvertError(null);
    setLead(result.lead);
    openCustomer(
      result.customerId,
      result.lead.customer?.name ?? result.lead.name,
    );
  }

  async function handleStageChange(
    status: LeadStatus,
  ) {
    if (
      !lead ||
      status === lead.status ||
      updating
    ) {
      return;
    }

    // "Converted" is not just a label: it creates the customer
    // and deal. Route it through the conversion workflow.
    if (status === 'CONVERTED') {
      const confirmed = await confirmAction(
        'Convert lead',
        `Create a customer${lead.customerId ? '' : ` from “${lead.name}”`} and a new deal?`,
        'Convert',
      );
      if (!confirmed) {
        return;
      }

      setUpdating(true);
      try {
        handleConverted(await convertLead(lead.id));
      } catch (err) {
        setConvertError(getApiErrorMessage(err, 'Could not convert this lead.'));
      } finally {
        setUpdating(false);
      }
      return;
    }

    setUpdating(true);

    try {
      const result =
        await dispatch(
          changeLeadStatus({
            id: lead.id,
            status,
          }),
        ).unwrap();

      setLead(result);
    } finally {
      setUpdating(false);
    }
  }


  /* ==========================================================
     CALL
  ========================================================== */

  async function handleCall() {
    if (!lead?.phone) {
      return;
    }

    try {
      await Linking.openURL(
        `tel:${lead.phone}`,
      );
    } catch {
      // Unsupported phone action.
    }
  }


  /* ==========================================================
     EMAIL
  ========================================================== */

  async function handleEmail() {
    if (!lead?.email) {
      return;
    }

    try {
      await Linking.openURL(
        `mailto:${lead.email}`,
      );
    } catch {
      // Unsupported email action.
    }
  }


  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={['top']}
      >
        <View style={styles.loadingContainer}>

          <View style={styles.loadingIcon}>
            <Ionicons
              name="person-outline"
              size={28}
              color={colors.primary}
            />
          </View>

          <ActivityIndicator
            size="small"
            color={colors.primary}
          />

          <Text style={styles.loadingText}>
            Loading lead...
          </Text>

        </View>
      </SafeAreaView>
    );
  }


  /* ==========================================================
     ERROR
  ========================================================== */

  if (!lead) {
    return (
      <SafeAreaView
        style={styles.safeArea}
        edges={['top']}
      >
        <View style={styles.errorContainer}>

          <View style={styles.errorIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={30}
              color={colors.danger}
            />
          </View>

          <Text style={styles.errorTitle}>
            Couldn't load this lead
          </Text>

          <Text style={styles.errorText}>
            The lead may have been removed
            or is temporarily unavailable.
          </Text>

          <Pressable
            onPress={() =>
              navigation.goBack()
            }
            style={({ pressed }) => [
              styles.backErrorButton,
              pressed &&
                styles.pressed,
            ]}
          >
            <Ionicons
              name="arrow-back"
              size={17}
              color={colors.textInverse}
            />

            <Text
              style={
                styles.backErrorText
              }
            >
              Go back
            </Text>
          </Pressable>

        </View>
      </SafeAreaView>
    );
  }


  const statusColor =
    getStatusColor(
      lead.status,
    );

  const currentStageIndex =
    STAGES.findIndex(
      stage =>
        stage.value === lead.status,
    );


  /* ==========================================================
     UI
  ========================================================== */

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >

      <View style={styles.container}>

        {/* ==================================================
            TOP NAVIGATION
        ================================================== */}

        <View style={styles.topBar}>

          <Pressable
            onPress={() =>
              navigation.goBack()
            }
            hitSlop={10}
            style={({ pressed }) => [
              styles.backButton,
              pressed &&
                styles.pressed,
            ]}
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color={colors.text}
            />
          </Pressable>

          <View
            style={styles.topBarTitleWrap}
          >
            <Text
              style={styles.topBarTitle}
              numberOfLines={1}
            >
              Lead Details
            </Text>

            <Text
              style={styles.topBarSubtitle}
              numberOfLines={1}
            >
              {lead.name}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.moreButton,
              pressed &&
                styles.pressed,
            ]}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={colors.text}
            />
          </Pressable>

        </View>


        {/* ==================================================
            CONTENT
        ================================================== */}

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={[
            styles.content,
            isDesktop &&
              styles.desktopContent,
          ]}
        >

          <View
            style={[
              styles.contentInner,
              contentWidth
                ? {
                    width:
                      '100%',
                    maxWidth:
                      contentWidth,
                    alignSelf:
                      'center',
                  }
                : null,
            ]}
          >

            {/* ==============================================
                HERO
            ============================================== */}

            <View
              style={[
                styles.heroCard,
                isDesktop &&
                  styles.heroCardDesktop,
              ]}
            >

              <View
                style={[
                  styles.heroAvatar,
                  {
                    backgroundColor:
                      `${statusColor}15`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.heroAvatarText,
                    {
                      color:
                        statusColor,
                    },
                  ]}
                >
                  {lead.name
                    ?.charAt(0)
                    .toUpperCase() ||
                    '?'}
                </Text>
              </View>


              <View
                style={styles.heroInfo}
              >

                <View
                  style={
                    styles.heroTitleRow
                  }
                >

                  <Text
                    style={styles.heroName}
                    numberOfLines={2}
                  >
                    {lead.name}
                  </Text>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          `${statusColor}12`,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            statusColor,
                        },
                      ]}
                    />

                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color:
                            statusColor,
                        },
                      ]}
                    >
                      {formatStatus(
                        lead.status,
                      )}
                    </Text>
                  </View>

                </View>


                <View
                  style={
                    styles.sourceRow
                  }
                >
                  <Ionicons
                    name="globe-outline"
                    size={14}
                    color={
                      colors.textMuted
                    }
                  />

                  <Text
                    style={
                      styles.sourceText
                    }
                  >
                    {formatSource(
                      lead.source,
                    )}
                  </Text>
                </View>

              </View>

            </View>


            {/* ==============================================
                QUICK ACTIONS
            ============================================== */}

            <View
              style={
                styles.quickActions
              }
            >

              <Pressable
                disabled={!lead.phone}
                onPress={handleCall}
                style={({ pressed }) => [
                  styles.quickAction,
                  !lead.phone &&
                    styles.disabledAction,
                  pressed &&
                    styles.quickActionPressed,
                ]}
              >

                <View
                  style={[
                    styles.quickActionIcon,
                    styles.callActionIcon,
                  ]}
                >
                  <Ionicons
                    name="call"
                    size={19}
                    color={colors.primary}
                  />
                </View>

                <Text
                  style={
                    styles.quickActionTitle
                  }
                >
                  Call
                </Text>

                <Text
                  style={
                    styles.quickActionSubtitle
                  }
                >
                  {lead.phone
                    ? 'Contact lead'
                    : 'Unavailable'}
                </Text>

              </Pressable>


              <Pressable
                disabled={!lead.email}
                onPress={handleEmail}
                style={({ pressed }) => [
                  styles.quickAction,
                  !lead.email &&
                    styles.disabledAction,
                  pressed &&
                    styles.quickActionPressed,
                ]}
              >

                <View
                  style={[
                    styles.quickActionIcon,
                    styles.emailActionIcon,
                  ]}
                >
                  <Ionicons
                    name="mail"
                    size={19}
                    color={colors.accent}
                  />
                </View>

                <Text
                  style={
                    styles.quickActionTitle
                  }
                >
                  Email
                </Text>

                <Text
                  style={
                    styles.quickActionSubtitle
                  }
                >
                  {lead.email
                    ? 'Send email'
                    : 'Unavailable'}
                </Text>

              </Pressable>


              <Pressable
                style={({ pressed }) => [
                  styles.quickAction,
                  pressed &&
                    styles.quickActionPressed,
                ]}
              >

                <View
                  style={[
                    styles.quickActionIcon,
                    styles.noteActionIcon,
                  ]}
                >
                  <Ionicons
                    name="create-outline"
                    size={19}
                    color="#0891B2"
                  />
                </View>

                <Text
                  style={
                    styles.quickActionTitle
                  }
                >
                  Note
                </Text>

                <Text
                  style={
                    styles.quickActionSubtitle
                  }
                >
                  Add activity
                </Text>

              </Pressable>

            </View>


            {/* ==============================================
                SALES PIPELINE
            ============================================== */}

            <View
              style={styles.card}
            >

              <View
                style={
                  styles.sectionHeader
                }
              >

                <View>

                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Sales pipeline
                  </Text>

                  <Text
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    Update the lead stage
                  </Text>

                </View>

                {updating ? (
                  <ActivityIndicator
                    size="small"
                    color={
                      colors.primary
                    }
                  />
                ) : (
                  <View
                    style={
                      styles.stageProgress
                    }
                  >
                    <Text
                      style={
                        styles.stageProgressText
                      }
                    >
                      {currentStageIndex +
                        1}
                      /{STAGES.length}
                    </Text>
                  </View>
                )}

              </View>


              {/* PIPELINE */}

              <View
                style={
                  styles.pipeline
                }
              >

                {STAGES.map(
                  (
                    stage,
                    index,
                  ) => {

                    const active =
                      lead.status ===
                      stage.value;

                    const completed =
                      index <
                      currentStageIndex;

                    const stageColor =
                      getStatusColor(
                        stage.value,
                      );

                    return (
                      <React.Fragment
                        key={
                          stage.value
                        }
                      >

                        <Pressable
                          disabled={
                            updating
                          }
                          onPress={() =>
                            handleStageChange(
                              stage.value,
                            )
                          }
                          style={({ pressed }) => [
                            styles.pipelineStage,
                            pressed &&
                              styles.pressed,
                          ]}
                        >

                          <View
                            style={[
                              styles.pipelineCircle,
                              active && {
                                backgroundColor:
                                  stageColor,
                                borderColor:
                                  stageColor,
                              },
                              completed && {
                                backgroundColor:
                                  '#E8F5EE',
                                borderColor:
                                  colors.success,
                              },
                            ]}
                          >

                            <Ionicons
                              name={
                                completed
                                  ? 'checkmark'
                                  : stage.icon
                              }
                              size={
                                active
                                  ? 17
                                  : 15
                              }
                              color={
                                active
                                  ? '#FFFFFF'
                                  : completed
                                    ? colors.success
                                    : colors.textMuted
                              }
                            />

                          </View>

                          <Text
                            style={[
                              styles.pipelineLabel,
                              active && {
                                color:
                                  stageColor,
                                fontWeight:
                                  '700',
                              },
                            ]}
                            numberOfLines={
                              1
                            }
                          >
                            {stage.label}
                          </Text>

                        </Pressable>


                        {index <
                        STAGES.length -
                          1 ? (
                          <View
                            style={[
                              styles.pipelineLine,
                              index <
                                currentStageIndex &&
                                styles.pipelineLineCompleted,
                            ]}
                          />
                        ) : null}

                      </React.Fragment>
                    );
                  },
                )}

              </View>

            </View>


            {/* ==============================================
                CONVERT TO CUSTOMER / DEAL
            ============================================== */}

            <LeadConvertCard
              lead={lead}
              error={convertError}
              onConverted={handleConverted}
              onOpenCustomer={openCustomer}
            />


            {/* ==============================================
                CONTACT INFORMATION
            ============================================== */}

            <View
              style={styles.card}
            >

              <View
                style={
                  styles.sectionHeader
                }
              >

                <View>

                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Contact information
                  </Text>

                  <Text
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    Direct contact details
                  </Text>

                </View>

                <Ionicons
                  name="person-circle-outline"
                  size={22}
                  color={
                    colors.textMuted
                  }
                />

              </View>


              {lead.phone ? (
                <Pressable
                  onPress={handleCall}
                  style={({ pressed }) => [
                    styles.contactRow,
                    pressed &&
                      styles.contactPressed,
                  ]}
                >

                  <View
                    style={[
                      styles.contactIcon,
                      styles.phoneIcon,
                    ]}
                  >
                    <Ionicons
                      name="call"
                      size={18}
                      color={colors.primary}
                    />
                  </View>

                  <View
                    style={
                      styles.contactInfo
                    }
                  >
                    <Text
                      style={
                        styles.contactLabel
                      }
                    >
                      Phone
                    </Text>

                    <Text
                      style={
                        styles.contactValue
                      }
                      numberOfLines={1}
                    >
                      {lead.phone}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.contactArrow
                    }
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={
                        colors.primary
                      }
                    />
                  </View>

                </Pressable>
              ) : null}


              {lead.email ? (
                <Pressable
                  onPress={handleEmail}
                  style={({ pressed }) => [
                    styles.contactRow,
                    lead.phone &&
                      styles.contactBorder,
                    pressed &&
                      styles.contactPressed,
                  ]}
                >

                  <View
                    style={[
                      styles.contactIcon,
                      styles.emailIcon,
                    ]}
                  >
                    <Ionicons
                      name="mail"
                      size={18}
                      color={colors.accent}
                    />
                  </View>

                  <View
                    style={
                      styles.contactInfo
                    }
                  >
                    <Text
                      style={
                        styles.contactLabel
                      }
                    >
                      Email
                    </Text>

                    <Text
                      style={
                        styles.contactValue
                      }
                      numberOfLines={1}
                    >
                      {lead.email}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.contactArrow
                    }
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={
                        colors.primary
                      }
                    />
                  </View>

                </Pressable>
              ) : null}


              {lead.assignedTo ? (
                <View
                  style={[
                    styles.contactRow,
                    (lead.phone ||
                      lead.email) &&
                      styles.contactBorder,
                  ]}
                >

                  <View
                    style={[
                      styles.contactIcon,
                      styles.ownerIcon,
                    ]}
                  >
                    <Ionicons
                      name="shield-checkmark"
                      size={18}
                      color={colors.success}
                    />
                  </View>

                  <View
                    style={
                      styles.contactInfo
                    }
                  >

                    <Text
                      style={
                        styles.contactLabel
                      }
                    >
                      Assigned to
                    </Text>

                    <Text
                      style={
                        styles.contactValueDark
                      }
                      numberOfLines={1}
                    >
                      {lead.assignedTo.name}
                    </Text>

                  </View>

                </View>
              ) : null}


              {!lead.phone &&
              !lead.email &&
              !lead.assignedTo ? (
                <View
                  style={
                    styles.noContact
                  }
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color={
                      colors.textMuted
                    }
                  />

                  <Text
                    style={
                      styles.noContactText
                    }
                  >
                    No contact information
                    available.
                  </Text>
                </View>
              ) : null}

            </View>


            {/* ==============================================
                LEAD OVERVIEW
            ============================================== */}

            <View
              style={styles.card}
            >

              <View
                style={
                  styles.sectionHeader
                }
              >

                <View>

                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Lead overview
                  </Text>

                  <Text
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    Key lead information
                  </Text>

                </View>

                <Ionicons
                  name="analytics-outline"
                  size={21}
                  color={
                    colors.primary
                  }
                />

              </View>


              <View
                style={
                  styles.overviewGrid
                }
              >

                <View
                  style={
                    styles.overviewItem
                  }
                >

                  <View
                    style={
                      styles.overviewIcon
                    }
                  >
                    <Ionicons
                      name="flag-outline"
                      size={16}
                      color={
                        colors.primary
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.overviewText
                    }
                  >
                    <Text
                      style={
                        styles.overviewLabel
                      }
                    >
                      Status
                    </Text>

                    <Text
                      style={[
                        styles.overviewValue,
                        {
                          color:
                            statusColor,
                        },
                      ]}
                    >
                      {formatStatus(
                        lead.status,
                      )}
                    </Text>
                  </View>

                </View>


                <View
                  style={
                    styles.overviewItem
                  }
                >

                  <View
                    style={[
                      styles.overviewIcon,
                      styles.sourceOverviewIcon,
                    ]}
                  >
                    <Ionicons
                      name="globe-outline"
                      size={16}
                      color={colors.accent}
                    />
                  </View>

                  <View
                    style={
                      styles.overviewText
                    }
                  >
                    <Text
                      style={
                        styles.overviewLabel
                      }
                    >
                      Source
                    </Text>

                    <Text
                      style={
                        styles.overviewValue
                      }
                      numberOfLines={1}
                    >
                      {formatSource(
                        lead.source,
                      )}
                    </Text>
                  </View>

                </View>

              </View>

            </View>


            {/* ==============================================
                AI INSIGHT
            ============================================== */}

            <View
              style={
                styles.aiCard
              }
            >

              <View
                style={
                  styles.aiHeader
                }
              >

                <View
                  style={
                    styles.aiIcon
                  }
                >
                  <Ionicons
                    name="bulb"
                    size={18}
                    color={colors.textInverse}
                  />
                </View>

                <View
                  style={
                    styles.aiHeaderText
                  }
                >
                  <Text
                    style={
                      styles.aiTitle
                    }
                  >
                    AI Sales Insight
                  </Text>

                  <Text
                    style={
                      styles.aiSubtitle
                    }
                  >
                    Smart recommendation
                  </Text>
                </View>

                <View
                  style={
                    styles.aiBadge
                  }
                >
                  <Text
                    style={
                      styles.aiBadgeText
                    }
                  >
                    AI
                  </Text>
                </View>

              </View>


              <View
                style={
                  styles.aiInsightBody
                }
              >

                <Ionicons
                  name="bulb-outline"
                  size={18}
                  color={colors.primary}
                />

                <Text
                  style={
                    styles.aiInsightText
                  }
                >
                  Keep this lead engaged and
                  follow up based on its current
                  pipeline stage. Consistent
                  follow-ups can improve
                  conversion probability.
                </Text>

              </View>

            </View>


            {/* ==============================================
                ACTIVITY
            ============================================== */}

            <View
              style={styles.card}
            >

              <View
                style={
                  styles.sectionHeader
                }
              >

                <View>

                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Recent activity
                  </Text>

                  <Text
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    Lead engagement timeline
                  </Text>

                </View>

                <Ionicons
                  name="time-outline"
                  size={21}
                  color={
                    colors.textMuted
                  }
                />

              </View>


              <View
                style={
                  styles.activityEmpty
                }
              >

                <View
                  style={
                    styles.activityIcon
                  }
                >
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={
                      colors.primary
                    }
                  />
                </View>

                <View
                  style={
                    styles.activityText
                  }
                >
                  <Text
                    style={
                      styles.activityTitle
                    }
                  >
                    No recent activity
                  </Text>

                  <Text
                    style={
                      styles.activitySubtitle
                    }
                  >
                    Activities and follow-ups
                    will appear here.
                  </Text>
                </View>

              </View>

            </View>


            {/* ==============================================
                LEAD ID
            ============================================== */}

            <View
              style={
                styles.footer
              }
            >

              <Text
                style={
                  styles.footerLabel
                }
              >
                LEAD ID
              </Text>

              <Text
                style={
                  styles.footerId
                }
                numberOfLines={1}
              >
                {lead.id}
              </Text>

            </View>

          </View>

        </ScrollView>

      </View>

    </SafeAreaView>
  );
}


/* ============================================================
   STYLES
============================================================ */

const styles = createThemedStyles(() => StyleSheet.create({

  /* ==========================================================
     ROOT
  ========================================================== */

  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },


  /* ==========================================================
     TOP BAR
  ========================================================== */

  topBar: {
    height: 60,

    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 18,

    backgroundColor: colors.surface,

    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  backButton: {
    width: 40,
    height: 40,

    borderRadius: 12,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.background,
  },

  topBarTitleWrap: {
    flex: 1,

    minWidth: 0,

    marginLeft: 13,
  },

  topBarTitle: {
    color: colors.text,

    fontSize: 17,
    fontWeight: '800',

    letterSpacing: -0.2,
  },

  topBarSubtitle: {
    marginTop: 1,

    color: colors.textFaint,

    fontSize: 10.5,
    fontWeight: '500',
  },

  moreButton: {
    width: 40,
    height: 40,

    borderRadius: 12,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.background,
  },


  /* ==========================================================
     CONTENT
  ========================================================== */

  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 35,
  },

  desktopContent: {
    paddingHorizontal: 24,
  },

  contentInner: {
    width: '100%',
  },


  /* ==========================================================
     HERO
  ========================================================== */

  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',

    padding: 17,

    backgroundColor: colors.surface,

    borderWidth: 1,
    borderColor: colors.border,

    borderRadius: 20,

    shadowColor: '#0F172A',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.045,
    shadowRadius: 10,
    elevation: 2,

    marginBottom: 10,
  },

  heroCardDesktop: {
    padding: 22,
  },

  heroAvatar: {
    width: 62,
    height: 62,

    borderRadius: 19,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 14,
  },

  heroAvatarText: {
    fontSize: 25,
    fontWeight: '800',
  },

  heroInfo: {
    flex: 1,
    minWidth: 0,
  },

  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  heroName: {
    flex: 1,

    color: colors.text,

    fontSize: 22,
    lineHeight: 28,

    fontWeight: '800',

    letterSpacing: -0.4,

    marginRight: 10,
  },

  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',

    marginTop: 7,
  },

  sourceText: {
    marginLeft: 5,

    color: colors.textMuted,

    fontSize: 12.5,
    fontWeight: '500',
  },


  /* ==========================================================
     STATUS
  ========================================================== */

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingHorizontal: 9,
    paddingVertical: 6,

    borderRadius: 999,

    maxWidth: 115,
  },

  statusDot: {
    width: 6,
    height: 6,

    borderRadius: 3,

    marginRight: 5,
  },

  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },


  /* ==========================================================
     QUICK ACTIONS
  ========================================================== */

  quickActions: {
    flexDirection: 'row',

    marginBottom: 10,
  },

  quickAction: {
    flex: 1,

    alignItems: 'center',

    paddingVertical: 14,

    backgroundColor: colors.surface,

    borderWidth: 1,
    borderColor: colors.border,

    borderRadius: 16,

    marginHorizontal: 3,
  },

  quickActionIcon: {
    width: 38,
    height: 38,

    borderRadius: 12,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 7,
  },

  callActionIcon: {
    backgroundColor: colors.primaryLight,
  },

  emailActionIcon: {
    backgroundColor: colors.accentSoft,
  },

  noteActionIcon: {
    backgroundColor: '#ECFEFF',
  },

  quickActionTitle: {
    color: colors.text,

    fontSize: 12.5,
    fontWeight: '500',
  },

  quickActionSubtitle: {
    marginTop: 2,

    color: colors.textFaint,

    fontSize: 9.5,
    fontWeight: '500',
  },

  disabledAction: {
    opacity: 0.45,
  },

  quickActionPressed: {
    opacity: 0.75,
    transform: [
      {
        scale: 0.97,
      },
    ],
  },


  /* ==========================================================
     CARDS
  ========================================================== */

  card: {
    padding: 16,

    backgroundColor: colors.surface,

    borderWidth: 1,
    borderColor: colors.border,

    borderRadius: 18,

    marginBottom: 10,

    shadowColor: '#0F172A',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.035,
    shadowRadius: 8,
    elevation: 1,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',

    marginBottom: 15,
  },

  sectionTitle: {
    color: colors.text,

    fontSize: 15.5,
    fontWeight: '800',

    letterSpacing: -0.1,
  },

  sectionSubtitle: {
    marginTop: 3,

    color: colors.textFaint,

    fontSize: 10.5,
    fontWeight: '500',
  },


  /* ==========================================================
     PIPELINE
  ========================================================== */

  stageProgress: {
    paddingHorizontal: 9,
    paddingVertical: 5,

    borderRadius: 999,

    backgroundColor: colors.primaryLight,
  },

  stageProgressText: {
    color: colors.primary,

    fontSize: 10,
    fontWeight: '800',
  },

  pipeline: {
    flexDirection: 'row',
    alignItems: 'flex-start',

    width: '100%',
  },

  pipelineStage: {
    flex: 1,

    alignItems: 'center',

    minWidth: 0,
  },

  pipelineCircle: {
    width: 34,
    height: 34,

    borderRadius: 17,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.background,

    borderWidth: 1.5,
    borderColor: colors.border,
  },

  pipelineLine: {
    flex: 1,

    height: 2,

    marginTop: 16,

    backgroundColor: '#E2E8F0',
  },

  pipelineLineCompleted: {
    backgroundColor: '#86EFAC',
  },

  pipelineLabel: {
    width: '100%',

    marginTop: 7,

    color: colors.textFaint,

    fontSize: 9.5,
    fontWeight: '600',

    textAlign: 'center',
  },


  /* ==========================================================
     CONTACT
  ========================================================== */

  contactRow: {
    minHeight: 61,

    flexDirection: 'row',
    alignItems: 'center',

    paddingVertical: 7,
  },

  contactBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  contactIcon: {
    width: 40,
    height: 40,

    borderRadius: 12,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 11,
  },

  phoneIcon: {
    backgroundColor: colors.primaryLight,
  },

  emailIcon: {
    backgroundColor: colors.accentSoft,
  },

  ownerIcon: {
    backgroundColor: colors.successSoft,
  },

  contactInfo: {
    flex: 1,

    minWidth: 0,
  },

  contactLabel: {
    color: colors.textFaint,

    fontSize: 10.5,
    fontWeight: '600',
  },

  contactValue: {
    marginTop: 3,

    color: colors.primary,

    fontSize: 13.5,
    fontWeight: '500',
  },

  contactValueDark: {
    marginTop: 3,

    color: colors.text,

    fontSize: 13.5,
    fontWeight: '500',
  },

  contactArrow: {
    width: 30,
    height: 30,

    borderRadius: 10,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.background,
  },

  contactPressed: {
    opacity: 0.7,
  },

  noContact: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingVertical: 15,
  },

  noContactText: {
    marginLeft: 8,

    color: colors.textFaint,

    fontSize: 12,
  },


  /* ==========================================================
     OVERVIEW
  ========================================================== */

  overviewGrid: {
    flexDirection: 'row',

    marginHorizontal: -5,
  },

  overviewItem: {
    flex: 1,

    flexDirection: 'row',
    alignItems: 'center',

    marginHorizontal: 5,

    padding: 11,

    borderRadius: 13,

    backgroundColor: colors.background,
  },

  overviewIcon: {
    width: 32,
    height: 32,

    borderRadius: 10,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.primaryLight,

    marginRight: 8,
  },

  sourceOverviewIcon: {
    backgroundColor: colors.accentSoft,
  },

  overviewText: {
    flex: 1,
    minWidth: 0,
  },

  overviewLabel: {
    color: colors.textFaint,

    fontSize: 9.5,
    fontWeight: '600',
  },

  overviewValue: {
    marginTop: 3,

    color: colors.text,

    fontSize: 12,
    fontWeight: '500',
  },


  /* ==========================================================
     AI INSIGHT
  ========================================================== */

  aiCard: {
    marginBottom: 10,

    padding: 16,

    borderRadius: 18,

    backgroundColor: '#F5F9FF',

    borderWidth: 1,
    borderColor: '#DCEBFF',
  },

  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  aiIcon: {
    width: 38,
    height: 38,

    borderRadius: 12,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.primary,
  },

  aiHeaderText: {
    flex: 1,

    marginLeft: 10,
  },

  aiTitle: {
    color: colors.text,

    fontSize: 13.5,
    fontWeight: '800',
  },

  aiSubtitle: {
    marginTop: 2,

    color: colors.textMuted,

    fontSize: 10.5,
  },

  aiBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,

    borderRadius: 999,

    backgroundColor: colors.primaryLight,
  },

  aiBadgeText: {
    color: colors.primary,

    fontSize: 9,
    fontWeight: '900',

    letterSpacing: 0.5,
  },

  aiInsightBody: {
    flexDirection: 'row',

    marginTop: 14,
    paddingTop: 13,

    borderTopWidth: 1,
    borderTopColor: colors.primaryLight,
  },

  aiInsightText: {
    flex: 1,

    marginLeft: 9,

    color: colors.textSecondary,

    fontSize: 12,

    lineHeight: 18,

    fontWeight: '500',
  },


  /* ==========================================================
     ACTIVITY
  ========================================================== */

  activityEmpty: {
    flexDirection: 'row',
    alignItems: 'center',

    padding: 12,

    borderRadius: 13,

    backgroundColor: colors.background,
  },

  activityIcon: {
    width: 38,
    height: 38,

    borderRadius: 11,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.primaryLight,

    marginRight: 10,
  },

  activityText: {
    flex: 1,
  },

  activityTitle: {
    color: '#334155',

    fontSize: 12.5,
    fontWeight: '700',
  },

  activitySubtitle: {
    marginTop: 3,

    color: colors.textFaint,

    fontSize: 10.5,
    lineHeight: 16,
  },


  /* ==========================================================
     FOOTER
  ========================================================== */

  footer: {
    alignItems: 'center',

    paddingVertical: 18,
  },

  footerLabel: {
    color: '#CBD5E1',

    fontSize: 8.5,
    fontWeight: '800',

    letterSpacing: 1,
  },

  footerId: {
    maxWidth: '90%',

    marginTop: 4,

    color: colors.textFaint,

    fontSize: 10.5,
    fontWeight: '500',
  },


  /* ==========================================================
     LOADING
  ========================================================== */

  loadingContainer: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.background,
  },

  loadingIcon: {
    width: 64,
    height: 64,

    borderRadius: 21,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.primaryLight,

    marginBottom: 17,
  },

  loadingText: {
    marginTop: 10,

    color: colors.textMuted,

    fontSize: 13,
    fontWeight: '500',
  },


  /* ==========================================================
     ERROR
  ========================================================== */

  errorContainer: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    paddingHorizontal: 30,

    backgroundColor: colors.background,
  },

  errorIcon: {
    width: 70,
    height: 70,

    borderRadius: 22,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: colors.dangerSoft,

    borderWidth: 1,
    borderColor: '#FECACA',

    marginBottom: 18,
  },

  errorTitle: {
    color: colors.text,

    fontSize: 20,
    fontWeight: '800',

    textAlign: 'center',
  },

  errorText: {
    maxWidth: 320,

    marginTop: 7,

    color: colors.textMuted,

    fontSize: 13,
    lineHeight: 20,

    textAlign: 'center',
  },

  backErrorButton: {
    flexDirection: 'row',
    alignItems: 'center',

    marginTop: 20,

    paddingHorizontal: 18,
    paddingVertical: 11,

    borderRadius: 12,

    backgroundColor: colors.primary,
  },

  backErrorText: {
    marginLeft: 7,

    color: colors.textInverse,

    fontSize: 13,
    fontWeight: '700',
  },


  /* ==========================================================
     GENERAL
  ========================================================== */

  pressed: {
    opacity: 0.7,
  },

}));