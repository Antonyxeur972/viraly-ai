import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { GlassPanel } from "../components/GlassPanel";
import { AnalysisHistoryList } from "../components/AnalysisHistoryList";
import { GrowthChart } from "../components/AnalyticsCharts";
import { NeonButton } from "../components/NeonButton";
import { GrowthJourney, Recommendation, RecommendationRail } from "../components/PremiumWidgets";
import { GrowthMetricKey } from "../components/CinematicVisuals";
import { ScreenHero } from "../components/ScreenHero";
import { SectionHeader } from "../components/SectionHeader";
import {
  GrowthAction,
  GrowthActionPlan,
  generateNextActions
} from "../services/ai";
import {
  ProfileAnalysisReport,
  requestProfileAnalysis
} from "../services/profileAnalysis";
import {
  AnalysisHistoryItem,
  deleteAnalysisHistory,
  listAnalysisHistory
} from "../services/analysisHistory";
import { estimateProfileRevenue } from "../lib/revenueModel";
import { palette, radius, spacing, typography } from "../theme";
import { CreatorOnboardingProfile, SocialConnectionStatus, SocialPlatform } from "../types";

type Props = {
  platform: SocialPlatform;
  socialStatus: SocialConnectionStatus;
  socialHandle?: string;
  profile: CreatorOnboardingProfile;
  onConnectSocial: () => void;
  onPlatformChange: (platform: SocialPlatform) => void;
  onProfileAnalyzed: (report: ProfileAnalysisReport) => void;
};

function actionHeading(value: string) {
  const heading = value.split(/[.:]/)[0].trim();
  if (heading.length <= 58) return heading;
  return `${heading.slice(0, 54).replace(/\s+\S*$/, "")}…`;
}

function actionCycleDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(value));
}

export function DashboardScreen({
  platform,
  socialStatus,
  socialHandle,
  onConnectSocial,
  onPlatformChange,
  onProfileAnalyzed,
  profile
}: Props) {
  const [screenshot, setScreenshot] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [report, setReport] = useState<ProfileAnalysisReport | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem<ProfileAnalysisReport>[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sourceMenuOpen, setSourceMenuOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [selectedGrowthMetric, setSelectedGrowthMetric] = useState<GrowthMetricKey | null>(null);
  const [revenueExpanded, setRevenueExpanded] = useState(false);
  const [profileReadOpen, setProfileReadOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const [actionPlan, setActionPlan] = useState<GrowthActionPlan | null>(null);
  const [actionHistory, setActionHistory] = useState<AnalysisHistoryItem<GrowthActionPlan>[]>([]);
  const [expandedExecution, setExpandedExecution] = useState<number | null>(0);
  const [actionHistoryOpen, setActionHistoryOpen] = useState(false);
  const [isGeneratingActions, setIsGeneratingActions] = useState(false);
  const connected = socialStatus === "connected";
  const platformLabel = platform === "instagram" ? "Instagram" : "TikTok";
  const platformIcon = platform === "instagram" ? "logo-instagram" : "logo-tiktok";
  const revenue = estimateProfileRevenue(profile, report?.metrics.followers);
  const euro = (value: number) => new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(value);

  useEffect(() => {
    let active = true;
    listAnalysisHistory<ProfileAnalysisReport>("profile")
      .then((items) => {
        if (!active) return;
        setHistory(items);
        if (items[0]?.report) {
          setReport(items[0].report);
          onProfileAnalyzed(items[0].report);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, [onProfileAnalyzed]);

  useEffect(() => {
    let active = true;
    listAnalysisHistory<GrowthActionPlan>("actions")
      .then((items) => {
        if (!active) return;
        setActionHistory(items);
        setActionPlan(items[0]?.report || null);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setScreenshot(null);
    setReport(null);
    setSelectedGrowthMetric(null);
    setSourceMenuOpen(false);
  }, [platform]);

  const analyzeScreenshot = async (asset: ImagePicker.ImagePickerAsset) => {
    setIsAnalyzing(true);
    try {
      const result = await requestProfileAnalysis(asset, platform);
      setReport(result);
      setActionPlan(null);
      setExpandedExecution(0);
      onProfileAnalyzed(result);
      setHistory((items) => [
        { id: result.analysisId, kind: "profile", createdAt: new Date().toISOString(), report: result },
        ...items.filter((item) => item.id !== result.analysisId)
      ].slice(0, 12));
    } catch (error) {
      Alert.alert("Analyse du profil", error instanceof Error ? error.message : "Analyse impossible.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const pickScreenshot = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Accès aux photos", "Autorise VIRALY AI à choisir la capture de ton profil.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setScreenshot(asset);
      setReport(null);
      setCaptureOpen(false);
      setSourceMenuOpen(false);
      await analyzeScreenshot(asset);
    }
  };

  const requestNextActions = async () => {
    if (isGeneratingActions) return;
    setIsGeneratingActions(true);
    try {
      const nextPlan = await generateNextActions(profile, report);
      setActionPlan(nextPlan);
      setExpandedExecution(0);
      setActionHistory((items) => [
        { id: nextPlan.analysisId, kind: "actions", createdAt: new Date().toISOString(), report: nextPlan },
        ...items.filter((item) => item.id !== nextPlan.analysisId)
      ].slice(0, 12));
    } catch (error) {
      Alert.alert("Actions suivantes", error instanceof Error ? error.message : "Génération impossible.");
    } finally {
      setIsGeneratingActions(false);
    }
  };

  const removeActionCycle = (item: AnalysisHistoryItem<GrowthActionPlan>) => {
    Alert.alert("Supprimer ce cycle ?", "Ses actions et échéances seront retirées de l'historique.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => {
          deleteAnalysisHistory(item.id)
            .then(() => {
              setActionHistory((items) => {
                const next = items.filter((entry) => entry.id !== item.id);
                if (actionPlan?.analysisId === item.id) setActionPlan(next[0]?.report || null);
                return next;
              });
            })
            .catch((error) => Alert.alert("Historique", error instanceof Error ? error.message : "Suppression impossible."));
        }
      }
    ]);
  };

  const removeHistoryItem = (item: AnalysisHistoryItem<ProfileAnalysisReport>) => {
    Alert.alert("Supprimer l'analyse", "Cette analyse ne sera plus disponible dans ton historique.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => {
          deleteAnalysisHistory(item.id)
            .then(() => {
              setHistory((items) => items.filter((entry) => entry.id !== item.id));
              if (report?.analysisId === item.id) setReport(null);
            })
            .catch((error) => Alert.alert("Historique", error instanceof Error ? error.message : "Suppression impossible."));
        }
      }
    ]);
  };

  const metrics = report
    ? [
        ["Abonnés", report.metrics.followers],
        ["J'aime", report.metrics.likes],
        ["Vidéos", report.metrics.videos],
        ["Compte", report.metrics.handle]
      ].filter((item): item is [string, string] => Boolean(item[1]))
    : [];

  const recommendationTitles = report?.priorities?.slice(0, 3) || [];
  const recommendations: Recommendation[] = [
    {
      color: palette.electric,
      icon: "trending-up-outline",
      label: "Potentiel de vues",
      title: recommendationTitles[0] || `Publie un carrousel utile pour ${profile.nicheTopic || profile.niche}`,
      value: "TRÈS ÉLEVÉ"
    },
    {
      color: palette.violet,
      icon: "time-outline",
      label: "Engagement attendu",
      title: recommendationTitles[1] || "Concentre la publication sur ton meilleur créneau",
      value: "+24%"
    },
    {
      color: palette.positive,
      icon: "layers-outline",
      label: "Portée potentielle",
      title: recommendationTitles[2] || "Décline le même angle en preuve, tutoriel et résultat",
      value: "+31%"
    }
  ];
  const fallbackSuccessMetrics = [
    "Le changement est visible et compréhensible sur mobile.",
    "Le contenu est publié et ses signaux sont relevés après 24 heures.",
    "Le test produit un résultat comparable: vues, sauvegardes ou réponses.",
    "L'angle retenu est planifié une seconde fois."
  ];
  const executionActions: GrowthAction[] = actionPlan?.actions?.length
    ? actionPlan.actions
    : (report?.priorities?.slice(0, 4) || recommendations.map((item) => item.title)).map((instruction, index) => ({
        title: actionHeading(instruction),
        instruction,
        deadlineDays: [2, 4, 7, 10][index] || 7,
        successMetric: fallbackSuccessMetrics[index] || fallbackSuccessMetrics[2]
      }));
  const selectedMetricInsight = selectedGrowthMetric === "score"
    ? {
        label: "CLARTÉ DU PROFIL",
        value: report ? `${report.score}/100` : "Analyse requise",
        detail: report?.summary || `Importe une capture ${platformLabel} pour mesurer la promesse, la lisibilité et la capacité du profil à convertir.`
      }
    : selectedGrowthMetric === "followers"
      ? {
          label: "AUDIENCE OBSERVÉE",
          value: report?.metrics.followers || profile.followers,
          detail: report?.metrics.followers
            ? `Nombre lu sur la capture du profil ${platformLabel}. Cette donnée alimente les projections et le rythme de publication.`
            : "Fourchette déclarée pendant la configuration. Une capture du profil permettra de la remplacer par la valeur visible."
        }
      : selectedGrowthMetric === "revenue"
        ? {
            label: "PROJECTION DE REVENU",
            value: `${euro(revenue.monthlyLow)} – ${euro(revenue.monthlyHigh)} / mois`,
            detail: `Projection calculée à partir de ${profile.nicheTopic || profile.niche}, de l'audience et du modèle ${profile.monetization}.`
          }
        : null;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.brandRow}>
          <TouchableOpacity
            accessibilityLabel={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            onPress={() => setMenuOpen((value) => !value)}
            style={styles.topIconButton}
          >
            <Ionicons color={palette.white} name={menuOpen ? "close" : "menu"} size={24} />
          </TouchableOpacity>
          <View style={styles.brandCenter}>
            <Text style={styles.brand}>VIRALY <Text style={styles.brandAccent}>AI</Text></Text>
            <Text numberOfLines={1} style={styles.handle}>{socialHandle || `${platformLabel} · studio créateur`}</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel={connected ? `${platformLabel} connecté` : `Connecter ${platformLabel}`}
            disabled={socialStatus === "connecting"}
            onPress={() => setSourceMenuOpen((value) => !value)}
            style={[styles.topIconButton, connected && styles.topIconActive]}
          >
            <Ionicons color={connected ? palette.cyan : palette.paperMuted} name={connected ? "checkmark" : "sparkles-outline"} size={22} />
            <View style={[styles.notificationDot, connected && styles.notificationDotConnected]} />
          </TouchableOpacity>
        </View>
        {menuOpen ? (
          <GlassPanel glow style={styles.quickMenu} textureOpacity={0.12}>
            <TouchableOpacity onPress={() => { onPlatformChange("tiktok"); setMenuOpen(false); setSourceMenuOpen(true); }} style={styles.quickMenuRow}>
              <Ionicons color={platform === "tiktok" ? palette.cyan : palette.paperMuted} name="logo-tiktok" size={18} />
              <Text style={styles.quickMenuText}>Utiliser TikTok</Text>
              <Ionicons color={platform === "tiktok" ? palette.positive : palette.muted} name={platform === "tiktok" ? "checkmark-circle" : "chevron-forward"} size={17} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { onPlatformChange("instagram"); setMenuOpen(false); setSourceMenuOpen(true); }} style={styles.quickMenuRow}>
              <Ionicons color={platform === "instagram" ? palette.cyan : palette.paperMuted} name="logo-instagram" size={18} />
              <Text style={styles.quickMenuText}>Utiliser Instagram</Text>
              <Ionicons color={platform === "instagram" ? palette.positive : palette.muted} name={platform === "instagram" ? "checkmark-circle" : "chevron-forward"} size={17} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setMenuOpen(false); pickScreenshot(); }} style={styles.quickMenuRow}>
              <Ionicons color={palette.cyan} name="images-outline" size={18} />
              <Text style={styles.quickMenuText}>Importer une capture de profil</Text>
              <Ionicons color={palette.muted} name="chevron-forward" size={16} />
            </TouchableOpacity>
          </GlassPanel>
        ) : null}
        <ScreenHero
          audienceMetric={report?.metrics.followers || profile.followers}
          eyebrow="Intelligence de croissance"
          icon="analytics-outline"
          metric={euro(revenue.monthlyHigh)}
          onGrowthMetricPress={setSelectedGrowthMetric}
          score={report?.score}
          subtitle="Analyses avancées, recommandations concrètes et actions mesurables pour faire progresser ton contenu et tes revenus."
          title={<>L'intelligence de ta <Text style={styles.titleAccent}>croissance.</Text></>}
          variant="growth"
        />
        {selectedMetricInsight ? (
          <View style={styles.metricInsight}>
            <View style={styles.metricInsightMark}><Ionicons color={palette.white} name="analytics" size={18} /></View>
            <View style={styles.metricInsightCopy}>
              <Text style={styles.metricInsightLabel}>{selectedMetricInsight.label}</Text>
              <Text style={styles.metricInsightValue}>{selectedMetricInsight.value}</Text>
              <Text style={styles.metricInsightDetail}>{selectedMetricInsight.detail}</Text>
            </View>
            <TouchableOpacity accessibilityLabel="Fermer le détail" onPress={() => setSelectedGrowthMetric(null)} style={styles.metricInsightClose}>
              <Ionicons color={palette.muted} name="close" size={17} />
            </TouchableOpacity>
          </View>
        ) : null}
        <NeonButton
          disabled={socialStatus === "connecting"}
          icon={connected ? "checkmark-circle" : platformIcon}
          onPress={() => setSourceMenuOpen((value) => !value)}
          title={socialStatus === "connecting" ? `Connexion à ${platformLabel}...` : connected ? `${platformLabel} connecté · importer` : `Connecter ou importer ${platformLabel}`}
        />
        {sourceMenuOpen ? (
          <GlassPanel glow style={styles.sourceMenu} textureOpacity={0.18}>
            <TouchableOpacity disabled={socialStatus === "connecting"} onPress={onConnectSocial} style={styles.sourceOption}>
              <View style={styles.sourceIcon}><Ionicons color={palette.white} name={platformIcon} size={21} /></View>
              <View style={styles.sourceCopy}>
                <Text style={styles.sourceTitle}>{connected ? `${platformLabel} est connecté` : `Connexion ${platformLabel}`}</Text>
                <Text style={styles.sourceMeta}>Importer les données autorisées du compte</Text>
              </View>
              <Ionicons color={palette.electric} name="chevron-forward" size={18} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setSourceMenuOpen(false); pickScreenshot(); }} style={styles.sourceOption}>
              <View style={styles.sourceIcon}><Ionicons color={palette.cyan} name="images-outline" size={21} /></View>
              <View style={styles.sourceCopy}>
                <Text style={styles.sourceTitle}>Capture depuis la galerie</Text>
                <Text style={styles.sourceMeta}>Bio, compteurs et grille visibles</Text>
              </View>
              <Ionicons color={palette.electric} name="chevron-forward" size={18} />
            </TouchableOpacity>
          </GlassPanel>
        ) : null}
        {screenshot ? (
          <View style={styles.captureDisclosure}>
            <TouchableOpacity onPress={() => setCaptureOpen((value) => !value)} style={styles.captureDisclosureTop}>
              <View style={[styles.captureStatus, report && styles.captureStatusReady]}>
                <Ionicons color={palette.white} name={isAnalyzing ? "hourglass-outline" : report ? "checkmark" : "image-outline"} size={16} />
              </View>
              <View style={styles.captureDisclosureCopy}>
                <Text style={styles.captureDisclosureTitle}>{isAnalyzing ? "Analyse du profil en cours" : report ? `Profil ${platformLabel} analysé` : "Capture importée"}</Text>
                <Text style={styles.captureDisclosureMeta}>{isAnalyzing ? "Lecture de la bio, des compteurs et de la grille" : "Voir la capture utilisée"}</Text>
              </View>
              <Ionicons color={palette.electric} name={captureOpen ? "chevron-up" : "chevron-down"} size={17} />
            </TouchableOpacity>
            {captureOpen ? (
              <View style={styles.capturePreview}>
                <Image source={{ uri: screenshot.uri }} style={styles.capturePreviewImage} />
                <Text style={styles.capturePreviewText}>{isAnalyzing ? "VIRALY lit les éléments visibles. Le bilan apparaîtra automatiquement." : report ? `Score ${report.score}/100 · ${report.metrics.followers || "audience non lisible"}` : "Cette capture est conservée pour relancer l'analyse si nécessaire."}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      <GlassPanel glow style={styles.revenuePanel} textureOpacity={0.24}>
        <View style={styles.revenueAccent} />
        <TouchableOpacity accessibilityRole="button" onPress={() => setRevenueExpanded((value) => !value)} style={styles.revenueTop}>
          <View style={styles.revenueIcon}>
            <Ionicons color={palette.white} name="trending-up" size={21} />
          </View>
          <View style={styles.revenueHeading}>
            <Text style={styles.revenueEyebrow}>REVENU POTENTIEL APRÈS OPTIMISATION</Text>
            <Text numberOfLines={1} style={styles.revenueChannel}>{revenueExpanded ? revenue.channel : `${euro(revenue.monthlyLow)} – ${euro(revenue.monthlyHigh)} / mois`}</Text>
          </View>
          <Ionicons color={palette.paperMuted} name={revenueExpanded ? "chevron-up" : "chevron-down"} size={18} />
        </TouchableOpacity>
        {revenueExpanded ? <View>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.revenueAmount}>
            {euro(revenue.monthlyLow)} – {euro(revenue.monthlyHigh)}
          </Text>
          <Text style={styles.revenueCaption}>Revenu potentiel après optimisations · estimation indicative</Text>
        </View> : null}
      </GlassPanel>

      <GlassPanel glow style={styles.projectionPanel} textureOpacity={0.11}>
        <View style={styles.projectionTop}>
          <View>
            <Text style={styles.projectionEyebrow}>VUE D'ENSEMBLE</Text>
            <Text style={styles.projectionTitle}>Projection</Text>
          </View>
          <View style={styles.periodPill}><Text style={styles.periodText}>28 JOURS</Text></View>
        </View>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: palette.electric }]} /><Text style={styles.legendText}>Vues</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: palette.cyan }]} /><Text style={styles.legendText}>Abonnés</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: palette.violet }]} /><Text style={styles.legendText}>Clients / conversion</Text></View>
        </View>
        <GrowthChart />
      </GlassPanel>

      <View style={styles.recommendationSection}>
        <SectionHeader eyebrow="Recommandations intelligentes" title="Actions à fort impact" />
        <RecommendationRail items={recommendations} onSelect={(item) => setSelectedRecommendation(item)} />
        {selectedRecommendation ? (
          <View style={styles.actionReveal}>
            <View style={[styles.actionRevealIcon, { backgroundColor: `${selectedRecommendation.color}20` }]}>
              <Ionicons color={selectedRecommendation.color} name={selectedRecommendation.icon} size={19} />
            </View>
            <View style={styles.actionRevealCopy}>
              <Text style={styles.actionRevealLabel}>ACTION À EXÉCUTER</Text>
              <Text style={styles.actionRevealText}>{selectedRecommendation.title}</Text>
            </View>
            <TouchableOpacity accessibilityLabel="Fermer" onPress={() => setSelectedRecommendation(null)}><Ionicons color={palette.muted} name="close" size={18} /></TouchableOpacity>
          </View>
        ) : null}
      </View>

      <GrowthJourney active={report ? 2 : 1} />

      <SectionHeader eyebrow="Priorité absolue" title="Ordre d'exécution" action={actionPlan ? "Cycle IA" : "Priorités profil"} />
      <View style={styles.executionStack}>
        {executionActions.map((action, index) => (
          <TouchableOpacity
            accessibilityRole="button"
            key={`${action.title}-${index}`}
            onPress={() => setExpandedExecution((current) => current === index ? null : index)}
            style={[styles.executionRow, index === 0 && styles.executionRowFirst]}
          >
            <View style={styles.executionTop}>
              <Text style={[styles.executionIndex, index === 0 && styles.executionIndexFirst]}>{String(index + 1).padStart(2, "0")}</Text>
              <View style={styles.executionCopy}>
                <Text style={styles.executionText}>{action.title}</Text>
                <Text style={styles.executionDeadline}>À faire sous {action.deadlineDays} jour{action.deadlineDays > 1 ? "s" : ""}</Text>
              </View>
              <Ionicons color={palette.electric} name={expandedExecution === index ? "chevron-up" : "chevron-down"} size={17} />
            </View>
            {expandedExecution === index ? (
              <View style={styles.executionDetail}>
                <Text style={styles.executionInstruction}>{action.instruction}</Text>
                <Text style={styles.executionMetricLabel}>RÉSULTAT ATTENDU</Text>
                <Text style={styles.executionMetric}>{action.successMetric}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actionCycleTools}>
        <TouchableOpacity disabled={isGeneratingActions} onPress={requestNextActions} style={styles.nextActionsButton}>
          <View style={styles.nextActionsIcon}><Ionicons color={palette.white} name={isGeneratingActions ? "hourglass-outline" : "arrow-forward-circle"} size={18} /></View>
          <Text style={styles.nextActionsText}>{isGeneratingActions ? "Préparation..." : "Actions suivantes"}</Text>
        </TouchableOpacity>
        <TouchableOpacity accessibilityLabel="Historique des actions" onPress={() => setActionHistoryOpen((value) => !value)} style={styles.actionHistoryButton}>
          <Ionicons color={palette.sky} name="time-outline" size={18} />
          <Text style={styles.actionHistoryCount}>{actionHistory.length}</Text>
        </TouchableOpacity>
      </View>
      {actionHistoryOpen ? (
        <View style={styles.actionHistoryList}>
          {actionHistory.length ? actionHistory.map((item, index) => (
            <View key={item.id} style={styles.actionHistoryRow}>
              <TouchableOpacity onPress={() => { setActionPlan(item.report); setExpandedExecution(0); }} style={styles.actionHistoryMain}>
                <Text style={styles.actionHistoryTitle}>{index === 0 ? "Cycle actuel" : `Cycle du ${actionCycleDate(item.createdAt)}`}</Text>
                <Text numberOfLines={2} style={styles.actionHistorySummary}>{item.report.summary}</Text>
              </TouchableOpacity>
              <TouchableOpacity accessibilityLabel="Supprimer ce cycle" onPress={() => removeActionCycle(item)} style={styles.actionHistoryDelete}>
                <Ionicons color={palette.muted} name="trash-outline" size={17} />
              </TouchableOpacity>
            </View>
          )) : <Text style={styles.actionHistoryEmpty}>Le premier cycle généré sera conservé ici.</Text>}
        </View>
      ) : null}

      {report ? (
        <>
          <View style={styles.profileData}>
            <View style={styles.profileScore}><Text style={styles.profileScoreValue}>{report.score}</Text><Text style={styles.profileScoreLabel}>CLARTÉ</Text></View>
            {metrics.slice(0, 3).map(([label, value]) => (
              <View key={label} style={styles.profileMetric}>
                <Text numberOfLines={1} style={styles.profileMetricValue}>{value}</Text>
                <Text style={styles.profileMetricLabel}>{label}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity accessibilityRole="button" onPress={() => setProfileReadOpen((value) => !value)} style={styles.profileReadHeader}>
            <View>
              <Text style={styles.profileReadEyebrow}>LECTURE STRATÉGIQUE</Text>
              <Text style={styles.profileReadTitle}>Ce que ton profil communique</Text>
            </View>
            <View style={styles.learnMore}><Text style={styles.learnMoreText}>{profileReadOpen ? "Réduire" : "En savoir plus"}</Text><Ionicons color={palette.electric} name={profileReadOpen ? "chevron-up" : "chevron-down"} size={16} /></View>
          </TouchableOpacity>
          {profileReadOpen ? (
            <GlassPanel style={styles.analysisPanel} textureOpacity={0.12}>
              <Text style={styles.analysisTitle}>SYNTHÈSE</Text>
              <Text style={styles.analysisText}>{report.summary}</Text>
              <View style={styles.divider} />
              <Text style={styles.analysisTitle}>POSITIONNEMENT</Text>
              <Text style={styles.analysisText}>{report.accountPositioning}</Text>
              <View style={styles.divider} />
              <Text style={styles.analysisTitle}>CONVERSION</Text>
              <Text style={styles.analysisText}>{report.revenueReadiness}</Text>
            </GlassPanel>
          ) : null}
        </>
      ) : null}

      <View style={styles.historySection}>
        <SectionHeader eyebrow="Mémoire" title="Historique des profils" action={`${history.length}`} />
        <AnalysisHistoryList
          activeId={report?.analysisId}
          emptyLabel={`Ta première analyse ${platformLabel} apparaîtra ici.`}
          items={history}
          onDelete={removeHistoryItem}
          onOpen={(item) => {
            setReport(item.report);
            onProfileAnalyzed(item.report);
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.md },
  historySection: { gap: spacing.md },
  hero: { gap: spacing.sm, paddingTop: spacing.sm },
  titleAccent: { color: palette.electric },
  brandRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg, minHeight: 52 },
  brandCenter: { alignItems: "center", flex: 1, minWidth: 0 },
  brand: { color: palette.white, fontSize: 23, fontWeight: "900" },
  brandAccent: { color: palette.electric },
  handle: { color: palette.muted, fontSize: 9, fontWeight: "800", marginTop: 2, maxWidth: 210 },
  topIconButton: { alignItems: "center", backgroundColor: "rgba(6,16,39,0.82)", borderColor: palette.line, borderRadius: radius.sm, borderWidth: 1, height: 46, justifyContent: "center", position: "relative", width: 46 },
  topIconActive: { borderColor: palette.lineStrong, shadowColor: palette.electric, shadowOpacity: 0.55, shadowRadius: 10 },
  notificationDot: { backgroundColor: palette.electric, borderColor: palette.ink, borderRadius: radius.pill, borderWidth: 2, height: 10, position: "absolute", right: 3, top: 3, width: 10 },
  notificationDotConnected: { backgroundColor: palette.positive },
  quickMenu: { gap: 0, marginBottom: spacing.sm, paddingHorizontal: spacing.md, zIndex: 8 },
  quickMenuRow: { alignItems: "center", borderBottomColor: palette.line, borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 52 },
  quickMenuText: { ...typography.caption, color: palette.white, flex: 1 },
  metricInsight: { alignItems: "flex-start", backgroundColor: "rgba(6,20,49,0.92)", borderColor: palette.lineStrong, borderRadius: radius.sm, borderWidth: 1, flexDirection: "row", gap: spacing.sm, marginTop: -spacing.md, padding: spacing.md },
  metricInsightMark: { alignItems: "center", backgroundColor: "rgba(36,104,244,0.72)", borderRadius: radius.sm, height: 36, justifyContent: "center", width: 36 },
  metricInsightCopy: { flex: 1, gap: 3, minWidth: 0 },
  metricInsightLabel: { color: palette.electric, fontSize: 8, fontWeight: "900" },
  metricInsightValue: { color: palette.white, fontSize: 14, fontWeight: "900", lineHeight: 19 },
  metricInsightDetail: { color: palette.paperMuted, fontSize: 10, lineHeight: 15 },
  metricInsightClose: { alignItems: "center", height: 28, justifyContent: "center", width: 28 },
  sourceMenu: { gap: 0, overflow: "hidden", paddingHorizontal: spacing.md },
  sourceOption: { alignItems: "center", flexDirection: "row", gap: spacing.md, minHeight: 72 },
  sourceIcon: { alignItems: "center", backgroundColor: "rgba(36,104,244,0.18)", borderRadius: radius.sm, height: 42, justifyContent: "center", width: 42 },
  sourceCopy: { flex: 1, gap: 3, minWidth: 0 },
  sourceTitle: { color: palette.white, fontSize: 14, fontWeight: "800" },
  sourceMeta: { color: palette.muted, fontSize: 10, lineHeight: 14 },
  captureDisclosure: { backgroundColor: "rgba(5,16,39,0.78)", borderRadius: radius.sm, overflow: "hidden" },
  captureDisclosureTop: { alignItems: "center", flexDirection: "row", gap: spacing.sm, minHeight: 58, paddingHorizontal: spacing.md },
  captureStatus: { alignItems: "center", backgroundColor: "rgba(37,102,230,0.78)", borderRadius: radius.sm, height: 32, justifyContent: "center", width: 32 },
  captureStatusReady: { backgroundColor: "rgba(14,135,122,0.82)" },
  captureDisclosureCopy: { flex: 1, gap: 2, minWidth: 0 },
  captureDisclosureTitle: { color: palette.white, fontSize: 12, fontWeight: "800" },
  captureDisclosureMeta: { color: palette.muted, fontSize: 9, lineHeight: 13 },
  capturePreview: { alignItems: "center", borderTopColor: palette.line, borderTopWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  capturePreviewImage: { aspectRatio: 9 / 19.5, borderRadius: radius.sm, height: 116 },
  capturePreviewText: { color: palette.paperMuted, flex: 1, fontSize: 11, lineHeight: 17 },
  revenuePanel: { gap: spacing.md, overflow: "hidden", padding: spacing.md },
  revenueAccent: { backgroundColor: palette.electric, bottom: 0, left: 0, position: "absolute", top: 0, width: 3 },
  revenueTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  revenueIcon: { alignItems: "center", backgroundColor: "rgba(31,102,242,0.62)", borderRadius: radius.sm, height: 40, justifyContent: "center", width: 40 },
  revenueHeading: { flex: 1, gap: 2, minWidth: 0 },
  revenueEyebrow: { ...typography.caption, color: palette.electric, fontSize: 9 },
  revenueChannel: { color: palette.white, fontSize: 13, fontWeight: "800" },
  revenueAmount: { color: palette.white, fontSize: 29, fontWeight: "900", lineHeight: 35 },
  revenueCaption: { color: palette.muted, fontSize: 9, lineHeight: 13 },
  projectionPanel: { gap: spacing.sm, padding: spacing.lg },
  projectionTop: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  projectionEyebrow: { ...typography.caption, color: palette.electric, fontSize: 9 },
  projectionTitle: { ...typography.h3, color: palette.white, marginTop: 2 },
  periodPill: { backgroundColor: "rgba(24,91,201,0.18)", borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  periodText: { color: palette.sky, fontSize: 9, fontWeight: "900" },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.xs },
  legendItem: { alignItems: "center", flexDirection: "row", gap: 5 },
  legendDot: { borderRadius: radius.pill, height: 7, width: 7 },
  legendText: { color: palette.paperMuted, fontSize: 9, fontWeight: "700" },
  recommendationSection: { gap: spacing.md },
  actionReveal: { alignItems: "center", backgroundColor: "rgba(7,20,48,0.84)", borderRadius: radius.md, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  actionRevealIcon: { alignItems: "center", borderRadius: radius.sm, height: 40, justifyContent: "center", width: 40 },
  actionRevealCopy: { flex: 1, gap: 3 },
  actionRevealLabel: { color: palette.electric, fontSize: 8, fontWeight: "900" },
  actionRevealText: { color: palette.white, fontSize: 13, fontWeight: "700", lineHeight: 18 },
  executionStack: { gap: spacing.xs, marginTop: -spacing.md },
  executionRow: { backgroundColor: "rgba(7,17,38,0.52)", borderRadius: radius.sm, gap: spacing.sm, padding: spacing.md },
  executionRowFirst: { backgroundColor: "rgba(23,74,166,0.52)", shadowColor: palette.electric, shadowOpacity: 0.35, shadowRadius: 10 },
  executionTop: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  executionIndex: { color: palette.muted, fontSize: 11, fontWeight: "900", width: 24 },
  executionIndexFirst: { color: palette.cyan },
  executionCopy: { flex: 1, gap: 3, minWidth: 0 },
  executionText: { color: palette.white, flex: 1, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  executionDeadline: { color: palette.sky, fontSize: 9, fontWeight: "800" },
  executionDetail: { borderTopColor: palette.line, borderTopWidth: 1, gap: spacing.xs, marginLeft: 36, paddingTop: spacing.sm },
  executionInstruction: { color: palette.paperMuted, fontSize: 12, lineHeight: 18 },
  executionMetricLabel: { color: palette.electric, fontSize: 8, fontWeight: "900", marginTop: spacing.xs },
  executionMetric: { color: palette.white, fontSize: 11, fontWeight: "700", lineHeight: 17 },
  actionCycleTools: { alignItems: "center", flexDirection: "row", gap: spacing.sm, marginTop: -spacing.md },
  nextActionsButton: { alignItems: "center", backgroundColor: "rgba(20,78,179,0.72)", borderRadius: radius.pill, flex: 1, flexDirection: "row", gap: spacing.sm, minHeight: 44, paddingHorizontal: spacing.sm },
  nextActionsIcon: { alignItems: "center", backgroundColor: palette.electric, borderRadius: radius.pill, height: 30, justifyContent: "center", width: 30 },
  nextActionsText: { color: palette.white, flex: 1, fontSize: 12, fontWeight: "900" },
  actionHistoryButton: { alignItems: "center", backgroundColor: "rgba(7,20,48,0.82)", borderRadius: radius.pill, flexDirection: "row", gap: 4, height: 44, justifyContent: "center", width: 62 },
  actionHistoryCount: { color: palette.white, fontSize: 11, fontWeight: "900" },
  actionHistoryList: { gap: spacing.xs, marginTop: -spacing.md },
  actionHistoryRow: { alignItems: "center", backgroundColor: "rgba(5,15,36,0.72)", borderRadius: radius.sm, flexDirection: "row", gap: spacing.sm, padding: spacing.sm },
  actionHistoryMain: { flex: 1, gap: 3, minWidth: 0 },
  actionHistoryTitle: { color: palette.sky, fontSize: 10, fontWeight: "900" },
  actionHistorySummary: { color: palette.paperMuted, fontSize: 10, lineHeight: 15 },
  actionHistoryDelete: { alignItems: "center", height: 36, justifyContent: "center", width: 36 },
  actionHistoryEmpty: { color: palette.muted, fontSize: 11, lineHeight: 17, padding: spacing.md, textAlign: "center" },
  profileData: { backgroundColor: "rgba(7,17,38,0.56)", borderRadius: radius.md, flexDirection: "row", minHeight: 66, overflow: "hidden" },
  profileScore: { alignItems: "center", backgroundColor: "rgba(34,104,246,0.24)", justifyContent: "center", paddingHorizontal: spacing.md },
  profileScoreValue: { color: palette.white, fontSize: 20, fontWeight: "900" },
  profileScoreLabel: { color: palette.electric, fontSize: 7, fontWeight: "900" },
  profileMetric: { flex: 1, justifyContent: "center", minWidth: 0, paddingHorizontal: spacing.xs },
  profileMetricValue: { color: palette.white, fontSize: 12, fontWeight: "800", textAlign: "center" },
  profileMetricLabel: { color: palette.muted, fontSize: 7, fontWeight: "800", marginTop: 2, textAlign: "center", textTransform: "uppercase" },
  profileReadHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: -spacing.sm },
  profileReadEyebrow: { color: palette.electric, fontSize: 8, fontWeight: "900" },
  profileReadTitle: { color: palette.white, fontSize: 16, fontWeight: "800", marginTop: 3 },
  learnMore: { alignItems: "center", flexDirection: "row", gap: 4 },
  learnMoreText: { color: palette.electric, fontSize: 10, fontWeight: "800" },
  analysisPanel: { gap: spacing.sm, padding: spacing.md },
  analysisTitle: { ...typography.caption, color: palette.electric, fontSize: 9 },
  analysisText: { color: palette.paperMuted, fontSize: 12, lineHeight: 18 },
  divider: { backgroundColor: palette.line, height: 1, marginVertical: spacing.xs }
});
