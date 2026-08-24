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
            <Text style={styles.handle}>{tiktokHandle || "Diagnostic créateur"}</Text>
          </View>
          <TouchableOpacity
            disabled={tiktokStatus === "connecting"}
            onPress={onConnectTikTok}
            style={[styles.connectButton, connected && styles.connectButtonActive]}
          >
            <Ionicons color={connected ? palette.ink : palette.white} name={connected ? "checkmark-circle" : "logo-tiktok"} size={18} />
            <Text style={[styles.connectText, connected && styles.connectTextActive]}>
              {tiktokStatus === "connecting" ? "Connexion..." : connected ? "Connecté" : "TikTok"}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>{report ? "Ton premier diagnostic." : "Partons de données réelles."}</Text>
        <Text style={styles.subtitle}>
          {report
            ? report.summary
            : "Connecte TikTok ou importe une capture complète. Aucun score n'est affiché avant analyse."}
        </Text>
      </View>

      {!connected ? (
        <GlassPanel style={styles.importPanel}>
          <View style={styles.importTop}>
            <View style={styles.importIcon}><Ionicons color={palette.ink} name="scan-outline" size={22} /></View>
            <View style={styles.importCopy}>
              <Text style={styles.importTitle}>Analyser la page d'accueil</Text>
              <Text style={styles.importBody}>Utilise une capture plein écran iPhone TikTok : bio, compteurs et vidéos visibles.</Text>
            </View>
          </View>
          {screenshot ? <Image source={{ uri: screenshot.uri }} style={styles.preview} /> : null}
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={pickScreenshot} style={styles.secondaryButton}>
              <Ionicons color={palette.white} name="images-outline" size={18} />
              <Text style={styles.secondaryText}>{screenshot ? "Changer" : "Choisir"}</Text>
            </TouchableOpacity>
            {screenshot ? (
              <TouchableOpacity disabled={isAnalyzing} onPress={analyze} style={styles.primaryButton}>
                <Ionicons color={palette.ink} name="sparkles-outline" size={18} />
                <Text style={styles.primaryText}>{isAnalyzing ? "Lecture..." : "Analyser"}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </GlassPanel>
      ) : null}

      {report ? (
        <>
          <ScoreDial
            caption={`Confiance ${report.confidence}. Données issues d'une capture, pas de l'API TikTok.`}
            color={palette.mint}
            label="Clarté du profil"
            score={report.score}
          />

          {metrics.length ? (
            <View style={styles.metricGrid}>
              {metrics.map(([label, value]) => (
                <View key={label} style={styles.metricCard}>
                  <Text style={styles.metricLabel}>{label}</Text>
                  <Text numberOfLines={2} style={styles.metricValue}>{value}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <SectionHeader eyebrow="Lecture IA" title="Ce que le profil communique" />
          <GlassPanel style={styles.analysisPanel}>
            <Text style={styles.analysisTitle}>Positionnement</Text>
            <Text style={styles.analysisText}>{report.accountPositioning}</Text>
            <View style={styles.divider} />
            <Text style={styles.analysisTitle}>Préparation revenu</Text>
            <Text style={styles.analysisText}>{report.revenueReadiness}</Text>
          </GlassPanel>

          <SectionHeader eyebrow="Priorités" title="Les prochaines corrections" />
          <View style={styles.stack}>
            {report.priorities.map((priority, index) => (
              <View key={priority} style={styles.priorityCard}>
                <Text style={styles.priorityIndex}>0{index + 1}</Text>
                <Text style={styles.priorityText}>{priority}</Text>
              </View>
            ))}
          </View>

          <GlassPanel style={styles.nextPanel}>
            <Text style={styles.nextLabel}>ACTION PRIORITAIRE</Text>
            <Text style={styles.nextText}>{report.nextAction}</Text>
            <ProgressBar color={palette.mint} value={report.score} />
          </GlassPanel>
        </>
      ) : (
        <View style={styles.waitingCard}>
          <Ionicons color={palette.mint} name="analytics-outline" size={24} />
          <View style={styles.waitingCopy}>
            <Text style={styles.waitingTitle}>Analyse en attente</Text>
            <Text style={styles.waitingBody}>Les recommandations apparaîtront après lecture du compte.</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  hero: { gap: spacing.sm },
  brandRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  brand: { ...typography.h2, color: palette.white },
  brandAccent: { color: palette.mint },
  handle: { ...typography.caption, color: palette.paperMuted, marginTop: 4 },
  title: { ...typography.title, color: palette.white },
  subtitle: { ...typography.body, color: palette.paperMuted },
  connectButton: { alignItems: "center", borderColor: palette.line, borderRadius: radius.pill, borderWidth: 1, flexDirection: "row", gap: spacing.xs, minHeight: 40, paddingHorizontal: spacing.md },
  connectButtonActive: { backgroundColor: palette.mint, borderColor: palette.mint },
  connectText: { ...typography.caption, color: palette.white },
  connectTextActive: { color: palette.ink },
  importPanel: { gap: spacing.md, padding: spacing.lg },
  importTop: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  importIcon: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.sm, height: 42, justifyContent: "center", width: 42 },
  importCopy: { flex: 1, gap: 4 },
  importTitle: { ...typography.h3, color: palette.white },
  importBody: { ...typography.body, color: palette.paperMuted },
  preview: { borderRadius: radius.md, height: 220, resizeMode: "cover", width: "100%" },
  buttonRow: { flexDirection: "row", gap: spacing.sm },
  secondaryButton: { alignItems: "center", borderColor: palette.line, borderRadius: radius.sm, borderWidth: 1, flexDirection: "row", gap: spacing.xs, justifyContent: "center", minHeight: 46, paddingHorizontal: spacing.md },
  secondaryText: { ...typography.caption, color: palette.white },
  primaryButton: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.sm, flex: 1, flexDirection: "row", gap: spacing.xs, justifyContent: "center", minHeight: 46, paddingHorizontal: spacing.md },
  primaryText: { ...typography.caption, color: palette.ink },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metricCard: { backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.sm, borderWidth: 1, flexBasis: "47%", flexGrow: 1, gap: 4, minWidth: 130, padding: spacing.md },
  metricLabel: { ...typography.caption, color: palette.muted },
  metricValue: { ...typography.h2, color: palette.white },
  analysisPanel: { gap: spacing.sm, padding: spacing.lg },
  analysisTitle: { ...typography.caption, color: palette.mint },
  analysisText: { ...typography.body, color: palette.white },
  divider: { backgroundColor: palette.line, height: 1, marginVertical: spacing.xs },
  stack: { gap: spacing.sm },
  priorityCard: { alignItems: "flex-start", backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.sm, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  priorityIndex: { ...typography.caption, color: palette.mint },
  priorityText: { ...typography.body, color: palette.white, flex: 1 },
  nextPanel: { gap: spacing.md, padding: spacing.lg },
  nextLabel: { ...typography.caption, color: palette.lemon },
  nextText: { ...typography.h3, color: palette.white },
  waitingCard: { alignItems: "center", backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  waitingCopy: { flex: 1, gap: 4 },
  waitingTitle: { ...typography.h3, color: palette.white },
  waitingBody: { ...typography.body, color: palette.paperMuted }
});
