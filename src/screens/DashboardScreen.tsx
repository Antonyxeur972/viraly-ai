import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
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
import { ProgressBar } from "../components/ProgressBar";
import { ScoreDial } from "../components/ScoreDial";
import { SectionHeader } from "../components/SectionHeader";
import {
  ProfileAnalysisReport,
  requestProfileAnalysis
} from "../services/profileAnalysis";
import { palette, radius, spacing, typography } from "../theme";
import { TikTokConnectionStatus } from "../types";

type Props = {
  tiktokStatus: TikTokConnectionStatus;
  tiktokHandle?: string;
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
  onProfileAnalyzed
}: Props) {
  const [screenshot, setScreenshot] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [report, setReport] = useState<ProfileAnalysisReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const connected = tiktokStatus === "connected";

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
    } catch (error) {
      Alert.alert("Analyse du profil", error instanceof Error ? error.message : "Analyse impossible.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const metrics = report
    ? [
        ["Abonnés", report.metrics.followers],
        ["J'aime", report.metrics.likes],
        ["Vidéos", report.metrics.videos],
        ["Compte", report.metrics.handle]
      ].filter((item): item is [string, string] => Boolean(item[1]))
    : [];

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.brandRow}>
          <View>
            <Text style={styles.brand}>VIRALY <Text style={styles.brandAccent}>AI</Text></Text>
            <Text style={styles.handle}>{tiktokHandle || "Studio créateur personnel"}</Text>
          </View>
          <TouchableOpacity
            disabled={tiktokStatus === "connecting"}
            onPress={onConnectTikTok}
            style={[styles.connectButton, connected && styles.connectButtonActive]}
          >
            <Ionicons color={connected ? palette.ink : palette.white} name={connected ? "checkmark" : "logo-tiktok"} size={18} />
            <Text style={[styles.connectText, connected && styles.connectTextActive]}>
              {tiktokStatus === "connecting" ? "Connexion..." : connected ? "Connecté" : "Connecter"}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.eyebrow}>TON BRIEFING DE CROISSANCE</Text>
        <Text style={styles.title}>{report ? "Ton profil dit déjà beaucoup." : "Décide à partir du réel."}</Text>
        <Text style={styles.subtitle}>
          {report
            ? report.summary
            : "Une capture suffit pour transformer ton profil en priorités de contenu, de conversion et de revenu."}
        </Text>
      </View>

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
        <GlassPanel style={styles.importPanel} textureOpacity={0.2}>
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
              <TouchableOpacity disabled={isAnalyzing} onPress={analyze} style={styles.primaryButton}>
                <Ionicons color={palette.ink} name="sparkles" size={18} />
                <Text style={styles.primaryText}>{isAnalyzing ? "Analyse en cours" : "Lancer l'analyse"}</Text>
              </TouchableOpacity>
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
  hero: { gap: spacing.sm, paddingTop: spacing.sm },
  brandRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg },
  brand: { color: palette.white, fontSize: 26, fontWeight: "800" },
  brandAccent: { color: palette.mint },
  handle: { ...typography.caption, color: palette.paperMuted, marginTop: 2 },
  eyebrow: { ...typography.caption, color: palette.mint },
  title: { ...typography.title, color: palette.white, maxWidth: 350 },
  subtitle: { ...typography.body, color: palette.paperMuted, maxWidth: 370 },
  connectButton: { alignItems: "center", backgroundColor: "rgba(3,15,10,0.56)", borderColor: palette.lineStrong, borderRadius: radius.pill, borderWidth: 1, flexDirection: "row", gap: spacing.xs, minHeight: 42, paddingHorizontal: spacing.md },
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
