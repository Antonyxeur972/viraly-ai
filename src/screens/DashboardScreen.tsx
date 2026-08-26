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
import { ProgressBar } from "../components/ProgressBar";
import { GrowthJourney, Recommendation, RecommendationRail } from "../components/PremiumWidgets";
import { ScoreDial } from "../components/ScoreDial";
import { ScreenHero } from "../components/ScreenHero";
import { SectionHeader } from "../components/SectionHeader";
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
import { CreatorOnboardingProfile, TikTokConnectionStatus } from "../types";

type Props = {
  tiktokStatus: TikTokConnectionStatus;
  tiktokHandle?: string;
  profile: CreatorOnboardingProfile;
  onConnectTikTok: () => void;
  onProfileAnalyzed: (report: ProfileAnalysisReport) => void;
};

const diagnosticSteps = [
  ["01", "Capture complète", "Bio, compteurs et grille visibles"],
  ["02", "Lecture visuelle", "Promesse, cohérence et conversion"],
  ["03", "Plan priorisé", "Une correction à exécuter d'abord"]
];

export function DashboardScreen({
  tiktokStatus,
  tiktokHandle,
  onConnectTikTok,
  onProfileAnalyzed,
  profile
}: Props) {
  const [screenshot, setScreenshot] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [report, setReport] = useState<ProfileAnalysisReport | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem<ProfileAnalysisReport>[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const connected = tiktokStatus === "connected";
  const revenue = estimateProfileRevenue(profile, report?.metrics.followers);
  const euro = (value: number) => new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(value);

  useEffect(() => {
    let active = true;
    listAnalysisHistory<ProfileAnalysisReport>("profile")
      .then((items) => active && setHistory(items))
      .catch(() => {});
    return () => { active = false; };
  }, []);

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
      setScreenshot(result.assets[0]);
      setReport(null);
    }
  };

  const analyze = async () => {
    if (!screenshot) return;
    setIsAnalyzing(true);
    try {
      const result = await requestProfileAnalysis(screenshot);
      setReport(result);
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

  const performanceMetrics = [
    { icon: "eye-outline" as const, label: "Clarté", value: report ? `${report.score}/100` : "À lire", delta: report ? "+ mesuré" : "capture requise" },
    { icon: "people-outline" as const, label: "Audience", value: report?.metrics.followers || profile.followers, delta: report ? "profil analysé" : "profil déclaré" },
    { icon: "flash-outline" as const, label: "Cadence", value: profile.cadence, delta: "cycle actif" },
    { icon: "cash-outline" as const, label: "Revenus", value: euro(revenue.monthlyHigh), delta: "potentiel optimisé" }
  ];
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
            <Text numberOfLines={1} style={styles.handle}>{tiktokHandle || "Studio créateur personnel"}</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel={connected ? "TikTok connecté" : "Connecter TikTok"}
            disabled={tiktokStatus === "connecting"}
            onPress={onConnectTikTok}
            style={[styles.topIconButton, connected && styles.topIconActive]}
          >
            <Ionicons color={connected ? palette.cyan : palette.paperMuted} name={connected ? "checkmark" : "sparkles-outline"} size={22} />
            <View style={[styles.notificationDot, connected && styles.notificationDotConnected]} />
          </TouchableOpacity>
        </View>
        {menuOpen ? (
          <GlassPanel glow style={styles.quickMenu} textureOpacity={0.12}>
            <TouchableOpacity onPress={() => { setMenuOpen(false); onConnectTikTok(); }} style={styles.quickMenuRow}>
              <Ionicons color={palette.electric} name="logo-tiktok" size={18} />
              <Text style={styles.quickMenuText}>{connected ? "Compte TikTok connecté" : "Connecter mon compte TikTok"}</Text>
              <Ionicons color={palette.muted} name="chevron-forward" size={16} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setMenuOpen(false); pickScreenshot(); }} style={styles.quickMenuRow}>
              <Ionicons color={palette.cyan} name="images-outline" size={18} />
              <Text style={styles.quickMenuText}>Importer une capture de profil</Text>
              <Ionicons color={palette.muted} name="chevron-forward" size={16} />
            </TouchableOpacity>
          </GlassPanel>
        ) : null}
        <ScreenHero
          eyebrow="Intelligence de croissance"
          icon="analytics-outline"
          metric={euro(revenue.monthlyHigh)}
          score={report?.score || 82}
          subtitle={report
            ? report.summary
            : "Analyses avancées, recommandations concrètes et actions mesurables pour faire progresser ton contenu et tes revenus."}
          title={report
            ? <>Ton profil révèle <Text style={styles.titleAccent}>le prochain levier.</Text></>
            : <>L'intelligence de ta <Text style={styles.titleAccent}>croissance.</Text></>}
          variant="growth"
        />
        <NeonButton
          disabled={tiktokStatus === "connecting"}
          icon={connected ? "checkmark-circle" : "logo-tiktok"}
          onPress={onConnectTikTok}
          title={tiktokStatus === "connecting" ? "Connexion à TikTok..." : connected ? "TikTok connecté" : "Connecter TikTok"}
        />
      </View>

      <GlassPanel glow style={styles.revenuePanel} textureOpacity={0.24}>
        <View style={styles.revenueAccent} />
        <View style={styles.revenueTop}>
          <View style={styles.revenueIcon}>
            <Ionicons color={palette.white} name="trending-up" size={21} />
          </View>
          <View style={styles.revenueHeading}>
            <Text style={styles.revenueEyebrow}>POTENTIEL MENSUEL PERSONNALISÉ</Text>
            <Text numberOfLines={1} style={styles.revenueChannel}>{revenue.channel}</Text>
          </View>
        </View>
        <View>
          <Text adjustsFontSizeToFit numberOfLines={1} style={styles.revenueAmount}>
            {euro(revenue.monthlyLow)} – {euro(revenue.monthlyHigh)}
          </Text>
          <Text style={styles.revenueCaption}>Revenu potentiel après optimisations · estimation indicative</Text>
        </View>
      </GlassPanel>

      <GlassPanel glow style={styles.projectionPanel} textureOpacity={0.11}>
        <View style={styles.projectionTop}>
          <View>
            <Text style={styles.projectionEyebrow}>VUE D'ENSEMBLE</Text>
            <Text style={styles.projectionTitle}>Projection d'exécution</Text>
          </View>
          <View style={styles.periodPill}><Text style={styles.periodText}>28 JOURS</Text></View>
        </View>
        <View style={styles.performanceBody}>
          <View style={styles.performanceList}>
            {performanceMetrics.map((item, index) => (
              <View key={item.label} style={[styles.performanceMetric, index < performanceMetrics.length - 1 && styles.performanceMetricRule]}>
                <View style={styles.performanceIcon}><Ionicons color={index === 3 ? palette.positive : palette.electric} name={item.icon} size={14} /></View>
                <View style={styles.performanceCopy}>
                  <Text style={styles.projectionLabel}>{item.label}</Text>
                  <Text numberOfLines={1} style={styles.performanceValue}>{item.value}</Text>
                  <Text style={[styles.performanceDelta, index === 3 && styles.performanceDeltaPositive]}>{item.delta}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={styles.chartColumn}>
            <View style={styles.chartTooltip}>
              <Text style={styles.chartTooltipLabel}>Aujourd'hui</Text>
              <Text style={styles.chartTooltipValue}>{report ? report.score : 82}</Text>
              <Text style={styles.chartTooltipDelta}>+18% vs hier</Text>
            </View>
            <GrowthChart />
          </View>
        </View>
      </GlassPanel>

      <View style={styles.recommendationSection}>
        <SectionHeader eyebrow="Recommandations intelligentes" title="Actions à fort impact" action="Voir tout" />
        <RecommendationRail items={recommendations} />
      </View>

      <GrowthJourney active={report ? 2 : 1} />

      {!report ? (
        <GlassPanel style={styles.briefPanel} textureOpacity={0.17}>
          <Text style={styles.panelEyebrow}>DIAGNOSTIC CRÉATEUR</Text>
          {diagnosticSteps.map(([index, label, detail]) => (
            <View key={index} style={styles.briefLine}>
              <Text style={styles.briefIndex}>{index}</Text>
              <View style={styles.briefCopy}>
                <Text style={styles.briefLabel}>{label}</Text>
                <Text style={styles.briefDetail}>{detail}</Text>
              </View>
              <Ionicons color={palette.muted} name="chevron-forward" size={16} />
            </View>
          ))}
        </GlassPanel>
      ) : null}

      {!connected ? (
        <GlassPanel glow style={styles.importPanel} textureOpacity={0.2}>
          <View style={styles.panelAccent} />
          <View style={styles.importTop}>
            <View style={styles.importIcon}><Ionicons color={palette.ink} name="scan-outline" size={23} /></View>
            <View style={styles.importCopy}>
              <Text style={styles.importTitle}>Importer ton profil TikTok</Text>
              <Text style={styles.importBody}>Capture plein écran iPhone, avec la bio, les compteurs et la grille de publications.</Text>
            </View>
          </View>
          {screenshot ? (
            <View style={styles.previewFrame}>
              <Image source={{ uri: screenshot.uri }} style={styles.preview} />
              <View style={styles.previewBadge}><Text style={styles.previewBadgeText}>CAPTURE PRÊTE</Text></View>
            </View>
          ) : null}
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={pickScreenshot} style={styles.secondaryButton}>
              <Ionicons color={palette.white} name="images-outline" size={18} />
              <Text style={styles.secondaryText}>{screenshot ? "Remplacer" : "Choisir une capture"}</Text>
            </TouchableOpacity>
            {screenshot ? (
              <View style={styles.primaryGrow}>
                <NeonButton compact disabled={isAnalyzing} onPress={analyze} title={isAnalyzing ? "Analyse en cours" : "Lancer l'analyse"} />
              </View>
            ) : null}
          </View>
          {isAnalyzing ? (
            <View style={styles.analysisStatus}>
              <View style={styles.statusDot} />
              <Text style={styles.analysisStatusText}>Lecture de la bio, de la promesse et du parcours de conversion...</Text>
            </View>
          ) : null}
        </GlassPanel>
      ) : null}

      <View style={styles.historySection}>
        <SectionHeader eyebrow="Mémoire" title="Historique des profils" action={`${history.length}`} />
        <AnalysisHistoryList
          activeId={report?.analysisId}
          emptyLabel="Ta première analyse de profil apparaîtra ici."
          items={history}
          onDelete={removeHistoryItem}
          onOpen={(item) => {
            setReport(item.report);
            onProfileAnalyzed(item.report);
          }}
        />
      </View>

      {report ? (
        <>
          <ScoreDial
            caption={`Confiance ${report.confidence}. Le score mesure la clarté visible, pas un potentiel viral garanti.`}
            color={palette.mint}
            label="Clarté du profil"
            score={report.score}
          />

          {metrics.length ? (
            <View style={styles.metricGrid}>
              {metrics.map(([label, value]) => (
                <GlassPanel key={label} style={styles.metricCard} textureOpacity={0.08}>
                  <Text style={styles.metricLabel}>{label}</Text>
                  <Text numberOfLines={2} style={styles.metricValue}>{value}</Text>
                </GlassPanel>
              ))}
            </View>
          ) : null}

          <SectionHeader eyebrow="Preuves visibles" title="Ce que l'IA a réellement lu" />
          <GlassPanel style={styles.signalPanel} textureOpacity={0.09}>
            {report.visibleSignals.map((signal, index) => (
              <View key={`${signal}-${index}`} style={styles.signalLine}>
                <Ionicons color={palette.mint} name="checkmark-circle" size={19} />
                <Text style={styles.signalText}>{signal}</Text>
              </View>
            ))}
          </GlassPanel>

          <SectionHeader eyebrow="Lecture stratégique" title="Ce que ton profil communique" />
          <GlassPanel style={styles.analysisPanel} textureOpacity={0.15}>
            <View style={styles.analysisBlock}>
              <Text style={styles.analysisTitle}>POSITIONNEMENT</Text>
              <Text style={styles.analysisText}>{report.accountPositioning}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.analysisBlock}>
              <Text style={styles.analysisTitle}>CHEMIN VERS LE REVENU</Text>
              <Text style={styles.analysisText}>{report.revenueReadiness}</Text>
            </View>
          </GlassPanel>

          <SectionHeader eyebrow="Ordre d'exécution" title="Les corrections qui comptent" />
          <View style={styles.stack}>
            {report.priorities.map((priority, index) => (
              <View key={`${priority}-${index}`} style={styles.priorityCard}>
                <View style={styles.priorityNumber}><Text style={styles.priorityIndex}>{index + 1}</Text></View>
                <Text style={styles.priorityText}>{priority}</Text>
              </View>
            ))}
          </View>

          <GlassPanel style={styles.nextPanel} textureOpacity={0.22}>
            <View style={styles.nextTop}>
              <Text style={styles.nextLabel}>PROCHAINE ACTION</Text>
              <Text style={styles.nextScore}>{report.score}/100</Text>
            </View>
            <Text style={styles.nextText}>{report.nextAction}</Text>
            <ProgressBar color={palette.mint} value={report.score} />
          </GlassPanel>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.md },
  historySection: { gap: spacing.md },
  hero: { gap: spacing.sm, paddingTop: spacing.sm },
  revenuePanel: { gap: spacing.md, overflow: "hidden", padding: spacing.xl },
  revenueAccent: { backgroundColor: palette.mint, bottom: 0, left: 0, position: "absolute", top: 0, width: 3 },
  revenueTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  revenueIcon: { alignItems: "center", backgroundColor: palette.mintDark, borderColor: palette.lineStrong, borderRadius: radius.sm, borderWidth: 1, height: 42, justifyContent: "center", width: 42 },
  revenueHeading: { flex: 1, gap: 2, minWidth: 0 },
  revenueEyebrow: { ...typography.caption, color: palette.mint, fontSize: 10 },
  revenueChannel: { ...typography.body, color: palette.white, fontWeight: "800" },
  revenueAmount: { color: palette.white, fontSize: 34, fontWeight: "900", lineHeight: 40 },
  revenueCaption: { ...typography.caption, color: palette.paperMuted },
  revenueDivider: { backgroundColor: palette.line, height: 1 },
  revenueAction: { ...typography.body, color: palette.white },
  revenueMetaRow: { gap: spacing.xs },
  revenueMeta: { alignItems: "center", flexDirection: "row", gap: spacing.xs, minWidth: 0 },
  revenueMetaText: { color: palette.paperMuted, flex: 1, fontSize: 11, fontWeight: "700", lineHeight: 16 },
  revenueDisclaimer: { color: palette.muted, fontSize: 9, lineHeight: 13 },
  projectionPanel: { gap: spacing.md, padding: spacing.lg },
  projectionTop: { alignItems: "center", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  projectionEyebrow: { ...typography.caption, color: palette.electric, fontSize: 10 },
  projectionTitle: { ...typography.h3, color: palette.white, marginTop: 3 },
  periodPill: { backgroundColor: "rgba(24,91,201,0.18)", borderColor: palette.lineStrong, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  periodText: { color: palette.sky, fontSize: 9, fontWeight: "900" },
  performanceBody: { alignItems: "stretch", flexDirection: "row", gap: spacing.sm, minHeight: 220 },
  performanceList: { justifyContent: "space-between", width: 108 },
  performanceMetric: { alignItems: "center", flexDirection: "row", gap: spacing.xs, minHeight: 48, paddingVertical: 4 },
  performanceMetricRule: { borderBottomColor: palette.line, borderBottomWidth: 1 },
  performanceIcon: { alignItems: "center", backgroundColor: "rgba(30,105,231,0.13)", borderRadius: radius.sm, height: 26, justifyContent: "center", width: 26 },
  performanceCopy: { flex: 1, minWidth: 0 },
  performanceValue: { color: palette.white, fontSize: 13, fontWeight: "900", lineHeight: 17 },
  performanceDelta: { color: palette.electric, fontSize: 7.5, fontWeight: "800", lineHeight: 10 },
  performanceDeltaPositive: { color: palette.positive },
  chartColumn: { flex: 1, justifyContent: "flex-end", minWidth: 0, overflow: "hidden", paddingTop: 34, position: "relative" },
  chartTooltip: { backgroundColor: "rgba(4,13,32,0.94)", borderColor: palette.lineStrong, borderRadius: radius.sm, borderWidth: 1, padding: 7, position: "absolute", right: 8, top: 0, zIndex: 3 },
  chartTooltipLabel: { color: palette.muted, fontSize: 7, fontWeight: "700" },
  chartTooltipValue: { color: palette.white, fontSize: 16, fontWeight: "900" },
  chartTooltipDelta: { color: palette.positive, fontSize: 7.5, fontWeight: "800" },
  recommendationSection: { gap: spacing.md },
  projectionMetric: { flex: 1, gap: 3, minWidth: 0 },
  projectionLabel: { color: palette.muted, fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  projectionValue: { color: palette.white, fontSize: 13, fontWeight: "800" },
  metricRule: { backgroundColor: palette.line, marginHorizontal: spacing.sm, width: 1 },
  signalValue: { color: palette.positive },
  brandRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg, minHeight: 52 },
  brandCenter: { alignItems: "center", flex: 1, minWidth: 0 },
  brand: { color: palette.white, fontSize: 23, fontWeight: "900" },
  brandAccent: { color: palette.mint },
  titleAccent: { color: palette.electric },
  handle: { color: palette.muted, fontSize: 8, fontWeight: "800", marginTop: 1, maxWidth: 190 },
  topIconButton: { alignItems: "center", backgroundColor: "rgba(6,16,39,0.82)", borderColor: palette.line, borderRadius: radius.sm, borderWidth: 1, height: 46, justifyContent: "center", position: "relative", width: 46 },
  topIconActive: { borderColor: palette.lineStrong, shadowColor: palette.electric, shadowOpacity: 0.55, shadowRadius: 10 },
  notificationDot: { backgroundColor: palette.electric, borderColor: palette.ink, borderRadius: radius.pill, borderWidth: 2, height: 10, position: "absolute", right: 3, top: 3, width: 10 },
  notificationDotConnected: { backgroundColor: palette.positive },
  quickMenu: { gap: 0, marginBottom: spacing.sm, paddingHorizontal: spacing.md, zIndex: 8 },
  quickMenuRow: { alignItems: "center", borderBottomColor: palette.line, borderBottomWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 52 },
  quickMenuText: { ...typography.caption, color: palette.white, flex: 1 },
  eyebrow: { ...typography.caption, color: palette.mint },
  title: { ...typography.title, color: palette.white, maxWidth: 350 },
  subtitle: { ...typography.body, color: palette.paperMuted, maxWidth: 370 },
  connectButton: { alignItems: "center", backgroundColor: "rgba(3,10,27,0.68)", borderColor: palette.lineStrong, borderRadius: radius.pill, borderWidth: 1, flexDirection: "row", gap: spacing.xs, minHeight: 42, paddingHorizontal: spacing.md },
  connectButtonActive: { backgroundColor: palette.mint, borderColor: palette.mint },
  connectText: { ...typography.caption, color: palette.white },
  connectTextActive: { color: palette.ink },
  briefPanel: { gap: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  panelEyebrow: { ...typography.caption, color: palette.mint, marginBottom: spacing.xs },
  briefLine: { alignItems: "center", borderBottomColor: palette.line, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 68 },
  briefIndex: { color: palette.mint, fontSize: 12, fontWeight: "800", width: 22 },
  briefCopy: { flex: 1, gap: 2 },
  briefLabel: { ...typography.body, color: palette.white, fontWeight: "700" },
  briefDetail: { ...typography.caption, color: palette.muted },
  importPanel: { gap: spacing.lg, padding: spacing.lg },
  panelAccent: { backgroundColor: palette.mint, bottom: 0, left: 0, position: "absolute", top: 0, width: 3 },
  importTop: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  importIcon: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.pill, height: 46, justifyContent: "center", width: 46 },
  importCopy: { flex: 1, gap: 4 },
  importTitle: { ...typography.h3, color: palette.white },
  importBody: { ...typography.body, color: palette.paperMuted },
  previewFrame: { alignSelf: "center", aspectRatio: 9 / 19.5, borderColor: palette.lineStrong, borderRadius: radius.lg, borderWidth: 1, maxHeight: 430, overflow: "hidden", position: "relative", width: "72%" },
  preview: { height: "100%", resizeMode: "cover", width: "100%" },
  previewBadge: { backgroundColor: palette.mint, borderRadius: radius.pill, left: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: 5, position: "absolute", top: spacing.sm },
  previewBadgeText: { color: palette.ink, fontSize: 9, fontWeight: "800" },
  buttonRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  secondaryButton: { alignItems: "center", borderColor: palette.lineStrong, borderRadius: radius.pill, borderWidth: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 50, paddingHorizontal: spacing.lg },
  secondaryText: { ...typography.caption, color: palette.white },
  primaryButton: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.pill, flex: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 50, minWidth: 150, paddingHorizontal: spacing.lg },
  primaryText: { ...typography.caption, color: palette.ink },
  primaryGrow: { flex: 1, minWidth: 170 },
  analysisStatus: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  statusDot: { backgroundColor: palette.mint, borderRadius: radius.pill, height: 8, width: 8 },
  analysisStatusText: { ...typography.caption, color: palette.paperMuted, flex: 1 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metricCard: { flexBasis: "47%", flexGrow: 1, gap: 4, minHeight: 92, minWidth: 130, padding: spacing.md },
  metricLabel: { ...typography.caption, color: palette.muted, textTransform: "uppercase" },
  metricValue: { ...typography.h2, color: palette.white },
  signalPanel: { gap: spacing.md, padding: spacing.lg },
  signalLine: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm },
  signalText: { ...typography.body, color: palette.white, flex: 1 },
  analysisPanel: { gap: spacing.lg, padding: spacing.xl },
  analysisBlock: { gap: spacing.sm },
  analysisTitle: { ...typography.caption, color: palette.mint },
  analysisText: { ...typography.body, color: palette.white },
  divider: { backgroundColor: palette.line, height: 1 },
  stack: { gap: spacing.sm },
  priorityCard: { alignItems: "flex-start", backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  priorityNumber: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.pill, height: 30, justifyContent: "center", width: 30 },
  priorityIndex: { color: palette.ink, fontSize: 12, fontWeight: "800" },
  priorityText: { ...typography.body, color: palette.white, flex: 1 },
  nextPanel: { gap: spacing.md, padding: spacing.xl },
  nextTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  nextLabel: { ...typography.caption, color: palette.mint },
  nextScore: { ...typography.caption, color: palette.paperMuted },
  nextText: { ...typography.h2, color: palette.white }
});
