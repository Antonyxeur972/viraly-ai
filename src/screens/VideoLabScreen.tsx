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
  ContentAnalysisReport,
  requestContentAnalysis
} from "../services/contentAnalysis";
import { palette, radius, spacing, typography } from "../theme";

export function VideoLabScreen() {
  const [mode, setMode] = useState<"video" | "carousel">("video");
  const [assets, setAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [report, setReport] = useState<ContentAnalysisReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const selectMode = (next: "video" | "carousel") => {
    setMode(next);
    setAssets([]);
    setReport(null);
  };

  const pickContent = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Accès aux photos", "Autorise VIRALY AI à ouvrir la galerie.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: mode === "carousel",
      mediaTypes: mode === "video" ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
      selectionLimit: mode === "carousel" ? 10 : 1,
      quality: 1
    });
    if (!result.canceled) {
      setAssets(result.assets);
      setReport(null);
    }
  };

  const analyze = async () => {
    if (!assets.length) return;
    setIsAnalyzing(true);
    try {
      setReport(await requestContentAnalysis(mode, assets));
    } catch (error) {
      Alert.alert("Analyse du contenu", error instanceof Error ? error.message : "Analyse impossible.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.kicker}>LABORATOIRE VISUEL</Text>
        <Text style={styles.title}>Analyse avant publication.</Text>
        <Text style={styles.subtitle}>L'IA lit les images, extrait des scènes de la vidéo et relie chaque correction à une action.</Text>
      </View>

      <View style={styles.segmentedControl}>
        {(["video", "carousel"] as const).map((item) => (
          <TouchableOpacity key={item} onPress={() => selectMode(item)} style={[styles.segment, mode === item && styles.segmentActive]}>
            <Ionicons color={mode === item ? palette.ink : palette.paperMuted} name={item === "video" ? "videocam-outline" : "images-outline"} size={18} />
            <Text style={[styles.segmentText, mode === item && styles.segmentTextActive]}>{item === "video" ? "Vidéo" : "Carrousel"}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity onPress={pickContent} style={styles.uploadButton}>
        <View style={styles.uploadIcon}><Ionicons color={palette.ink} name="cloud-upload-outline" size={24} /></View>
        <View style={styles.uploadCopy}>
          <Text style={styles.uploadTitle}>{assets.length ? `${assets.length} média${assets.length > 1 ? "s" : ""} prêt${assets.length > 1 ? "s" : ""}` : "Choisir depuis la galerie"}</Text>
          <Text style={styles.uploadMeta}>{assets[0]?.fileName || (mode === "video" ? "MP4 ou MOV" : "Jusqu'à 10 images ordonnées")}</Text>
        </View>
        <Ionicons color={palette.muted} name="chevron-forward" size={20} />
      </TouchableOpacity>

      {mode === "carousel" && assets.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewRail}>
          {assets.map((asset, index) => (
            <View key={`${asset.uri}-${index}`} style={styles.previewItem}>
              <Image source={{ uri: asset.uri }} style={styles.previewImage} />
              <Text style={styles.previewIndex}>{index + 1}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {assets.length ? (
        <TouchableOpacity disabled={isAnalyzing} onPress={analyze} style={styles.analyzeButton}>
          <Ionicons color={palette.ink} name="sparkles-outline" size={19} />
          <Text style={styles.analyzeText}>{isAnalyzing ? "Lecture des scènes..." : "Lancer l'analyse IA"}</Text>
        </TouchableOpacity>
      ) : null}

      {report ? (
        <>
          <ScoreDial caption={report.summary} color={palette.mint} label="Potentiel observé" score={report.score} />

          <GlassPanel style={styles.hookPanel}>
            <Text style={styles.panelLabel}>HOOK RÉVISÉ</Text>
            <Text style={styles.hookText}>{report.revisedHook}</Text>
            <View style={styles.divider} />
            <Text style={styles.panelLabel}>CHEMIN REVENU · {report.revenuePotential.level.toUpperCase()}</Text>
            <Text style={styles.panelText}>{report.revenuePotential.path}</Text>
            <Text style={styles.basisText}>{report.revenuePotential.basis}</Text>
          </GlassPanel>

          <SectionHeader eyebrow="Preuves" title="Lecture par dimension" />
          <View style={styles.stack}>
            {report.dimensions.map((dimension) => (
              <View key={dimension.name} style={styles.dimensionCard}>
                <View style={styles.dimensionTop}>
                  <Text style={styles.dimensionName}>{dimension.name}</Text>
                  <Text style={styles.dimensionScore}>{dimension.score}</Text>
                </View>
                <ProgressBar color={dimension.score >= 70 ? palette.mint : palette.lemon} value={dimension.score} />
                <Text style={styles.evidence}>{dimension.evidence}</Text>
                <Text style={styles.action}>Action : {dimension.action}</Text>
              </View>
            ))}
          </View>

          <SectionHeader eyebrow="Montage" title="Version recommandée" />
          <View style={styles.storyboard}>
            {report.storyboard.map((step, index) => (
              <View key={`${step}-${index}`} style={styles.storyStep}>
                <Text style={styles.storyIndex}>{index + 1}</Text>
                <Text style={styles.storyText}>{step}</Text>
              </View>
            ))}
          </View>

          <GlassPanel style={styles.ctaPanel}>
            <Text style={styles.panelLabel}>CTA DE CONVERSION</Text>
            <Text style={styles.hookText}>{report.revenueCta}</Text>
          </GlassPanel>
        </>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons color={palette.mint} name="scan-circle-outline" size={25} />
          <Text style={styles.emptyText}>Aucun score avant l'analyse réelle du contenu.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { gap: spacing.sm },
  kicker: { ...typography.caption, color: palette.mint },
  title: { ...typography.title, color: palette.white },
  subtitle: { ...typography.body, color: palette.paperMuted },
  segmentedControl: { backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", padding: 4 },
  segment: { alignItems: "center", borderRadius: radius.sm, flex: 1, flexDirection: "row", gap: spacing.xs, justifyContent: "center", minHeight: 42 },
  segmentActive: { backgroundColor: palette.mint },
  segmentText: { ...typography.caption, color: palette.paperMuted },
  segmentTextActive: { color: palette.ink },
  uploadButton: { alignItems: "center", backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 78, padding: spacing.md },
  uploadIcon: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.sm, height: 46, justifyContent: "center", width: 46 },
  uploadCopy: { flex: 1, gap: 4 },
  uploadTitle: { ...typography.h3, color: palette.white },
  uploadMeta: { ...typography.caption, color: palette.muted },
  previewRail: { marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg },
  previewItem: { marginRight: spacing.sm, position: "relative" },
  previewImage: { borderRadius: radius.sm, height: 130, width: 92 },
  previewIndex: { backgroundColor: palette.ink, borderRadius: radius.pill, color: palette.white, fontSize: 11, fontWeight: "800", paddingHorizontal: 7, paddingVertical: 3, position: "absolute", right: 5, top: 5 },
  analyzeButton: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.sm, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 50, paddingHorizontal: spacing.md },
  analyzeText: { ...typography.caption, color: palette.ink },
  hookPanel: { gap: spacing.sm, padding: spacing.lg },
  panelLabel: { ...typography.caption, color: palette.mint },
  hookText: { ...typography.h3, color: palette.white },
  panelText: { ...typography.body, color: palette.white },
  basisText: { ...typography.caption, color: palette.muted },
  divider: { backgroundColor: palette.line, height: 1, marginVertical: spacing.xs },
  stack: { gap: spacing.sm },
  dimensionCard: { backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  dimensionTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  dimensionName: { ...typography.h3, color: palette.white },
  dimensionScore: { color: palette.mint, fontSize: 22, fontWeight: "900" },
  evidence: { ...typography.body, color: palette.paperMuted },
  action: { ...typography.caption, color: palette.mint },
  storyboard: { backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  storyStep: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md },
  storyIndex: { ...typography.caption, color: palette.lemon, width: 18 },
  storyText: { ...typography.body, color: palette.white, flex: 1 },
  ctaPanel: { gap: spacing.sm, padding: spacing.lg },
  emptyCard: { alignItems: "center", backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  emptyText: { ...typography.body, color: palette.paperMuted, flex: 1 }
});
