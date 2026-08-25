import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
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
import { ProgressBar } from "../components/ProgressBar";
import { ScoreDial } from "../components/ScoreDial";
import { SectionHeader } from "../components/SectionHeader";
import {
  ContentAnalysisReport,
  requestContentAnalysis
} from "../services/contentAnalysis";
import {
  AnalysisHistoryItem,
  deleteAnalysisHistory,
  listAnalysisHistory
} from "../services/analysisHistory";
import { palette, radius, spacing, typography } from "../theme";

export function VideoLabScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [assets, setAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [report, setReport] = useState<ContentAnalysisReport | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem<ContentAnalysisReport>[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisTop, setAnalysisTop] = useState(0);
  const [reportFromHistory, setReportFromHistory] = useState(false);
  const [shouldRevealReport, setShouldRevealReport] = useState(false);

  useEffect(() => {
    let active = true;
    listAnalysisHistory<ContentAnalysisReport>("content")
      .then((items) => active && setHistory(items))
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!shouldRevealReport || !report || analysisTop <= 0) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        animated: true,
        y: Math.max(0, analysisTop - spacing.md)
      });
    });
    setShouldRevealReport(false);
  }, [analysisTop, report, shouldRevealReport]);

  const pickContent = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Accès aux photos", "Autorise VIRALY AI à ouvrir la galerie.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      selectionLimit: 10,
      quality: 1
    });
    if (!result.canceled) {
      setAssets(result.assets);
      setReport(null);
      setReportFromHistory(false);
    }
  };

  const analyze = async () => {
    if (!assets.length) return;
    setIsAnalyzing(true);
    try {
      const result = await requestContentAnalysis("carousel", assets);
      setReport(result);
      setReportFromHistory(false);
      setHistory((items) => [
        { id: result.analysisId, kind: "content", createdAt: new Date().toISOString(), report: result },
        ...items.filter((item) => item.id !== result.analysisId)
      ].slice(0, 12));
    } catch (error) {
      Alert.alert("Analyse du contenu", error instanceof Error ? error.message : "Analyse impossible.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const removeHistoryItem = (item: AnalysisHistoryItem<ContentAnalysisReport>) => {
    Alert.alert("Supprimer l'analyse", "Le post et son analyse seront retirés de l'historique.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: () => {
          deleteAnalysisHistory(item.id)
            .then(() => {
              setHistory((items) => items.filter((entry) => entry.id !== item.id));
              if (report?.analysisId === item.id) {
                setReport(null);
                setReportFromHistory(false);
              }
            })
            .catch((error) => Alert.alert("Historique", error instanceof Error ? error.message : "Suppression impossible."));
        }
      }
    ]);
  };

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.kicker}>AUDIT DE CONTENU</Text>
        <Text style={styles.title}>Passe chaque slide au crible.</Text>
        <Text style={styles.subtitle}>L'IA vérifie la couverture, la progression, la preuve et la conversion dans l'ordre réel du carrousel.</Text>
      </View>

      <View style={styles.modeCard}>
        <Ionicons color={palette.mint} name="images-outline" size={18} />
        <View style={styles.modeCopy}>
          <Text style={styles.modeText}>Carrousel photo</Text>
          <Text style={styles.modeMeta}>1 à 10 images · ordre conservé</Text>
        </View>
        <View style={styles.activeDot} />
      </View>

      <TouchableOpacity onPress={pickContent} style={styles.uploadButton}>
        <View style={styles.uploadIcon}><Ionicons color={palette.ink} name="cloud-upload-outline" size={24} /></View>
        <View style={styles.uploadCopy}>
          <Text style={styles.uploadTitle}>{assets.length ? `${assets.length} image${assets.length > 1 ? "s" : ""} prête${assets.length > 1 ? "s" : ""}` : "Choisir des photos TikTok"}</Text>
          <Text style={styles.uploadMeta}>{assets[0]?.fileName || "Jusqu'à 10 images ordonnées"}</Text>
        </View>
        <Ionicons color={palette.muted} name="chevron-forward" size={20} />
      </TouchableOpacity>

      {assets.length ? (
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
          <Ionicons color={palette.ink} name="sparkles" size={19} />
          <Text style={styles.analyzeText}>{isAnalyzing ? "Analyse slide par slide..." : "Lancer l'audit IA"}</Text>
        </TouchableOpacity>
      ) : null}

      {report ? (
        <View
          onLayout={(event) => setAnalysisTop(event.nativeEvent.layout.y)}
          style={styles.reportSection}
        >
          {reportFromHistory ? (
            <View style={styles.savedReportBanner}>
              <View style={styles.savedReportIcon}>
                <Ionicons color={palette.white} name="bookmark" size={18} />
              </View>
              <View style={styles.savedReportCopy}>
                <Text style={styles.savedReportLabel}>ANALYSE ENREGISTRÉE</Text>
                <Text numberOfLines={2} style={styles.savedReportTitle}>
                  {report.historyTitle || report.revisedHook}
                </Text>
                <Text style={styles.savedReportMeta}>Rapport complet restauré sans relancer l'IA.</Text>
              </View>
            </View>
          ) : null}

          <ScoreDial caption={report.summary} color={palette.mint} label="Force du carrousel" score={report.score} />

          <GlassPanel style={styles.hookPanel}>
            <Text style={styles.panelLabel}>COUVERTURE RECOMMANDÉE</Text>
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
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons color={palette.mint} name="scan-circle-outline" size={25} />
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>Dépose un carrousel à analyser</Text>
            <Text style={styles.emptyText}>Aucun score de démonstration : le verdict apparaît uniquement après lecture de tes images.</Text>
          </View>
        </View>
      )}

      <View style={styles.historySection}>
        <SectionHeader eyebrow="Bibliothèque" title="Posts et analyses enregistrés" action={`${history.length}`} />
        <AnalysisHistoryList
          activeId={report?.analysisId}
          emptyLabel="Après ton premier audit, le post et son rapport complet apparaîtront ici."
          items={history}
          onDelete={removeHistoryItem}
          onOpen={(item) => {
            setAssets([]);
            setReport(item.report);
            setReportFromHistory(true);
            setShouldRevealReport(true);
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.lg },
  historySection: { gap: spacing.md },
  reportSection: { gap: spacing.xl },
  savedReportBanner: { alignItems: "center", backgroundColor: palette.panel, borderColor: palette.mint, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  savedReportIcon: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.sm, height: 40, justifyContent: "center", width: 40 },
  savedReportCopy: { flex: 1, gap: 2, minWidth: 0 },
  savedReportLabel: { color: palette.mint, fontSize: 9, fontWeight: "900", lineHeight: 13 },
  savedReportTitle: { ...typography.caption, color: palette.white },
  savedReportMeta: { color: palette.muted, fontSize: 10, lineHeight: 14 },
  header: { gap: spacing.sm },
  kicker: { ...typography.caption, color: palette.mint },
  title: { ...typography.title, color: palette.white },
  subtitle: { ...typography.body, color: palette.paperMuted },
  modeCard: { alignItems: "center", backgroundColor: "rgba(3,10,27,0.68)", borderColor: palette.line, borderRadius: radius.pill, borderWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 52, paddingHorizontal: spacing.md },
  modeCopy: { flex: 1, gap: 1 },
  modeText: { ...typography.caption, color: palette.white },
  modeMeta: { color: palette.muted, fontSize: 10, lineHeight: 14 },
  activeDot: { backgroundColor: palette.mint, borderRadius: radius.pill, height: 8, width: 8 },
  uploadButton: { alignItems: "center", backgroundColor: palette.panel, borderColor: palette.lineStrong, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 88, padding: spacing.lg },
  uploadIcon: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.pill, height: 48, justifyContent: "center", width: 48 },
  uploadCopy: { flex: 1, gap: 4 },
  uploadTitle: { ...typography.h3, color: palette.white },
  uploadMeta: { ...typography.caption, color: palette.muted },
  previewRail: { marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg },
  previewItem: { marginRight: spacing.sm, position: "relative" },
  previewImage: { borderColor: palette.line, borderRadius: radius.sm, borderWidth: 1, height: 146, width: 103 },
  previewIndex: { backgroundColor: palette.ink, borderRadius: radius.pill, color: palette.white, fontSize: 11, fontWeight: "800", paddingHorizontal: 7, paddingVertical: 3, position: "absolute", right: 5, top: 5 },
  analyzeButton: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.pill, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 52, paddingHorizontal: spacing.lg },
  analyzeText: { ...typography.caption, color: palette.ink },
  hookPanel: { borderColor: palette.lineStrong, gap: spacing.md, padding: spacing.xl },
  panelLabel: { ...typography.caption, color: palette.mint },
  hookText: { ...typography.h3, color: palette.white },
  panelText: { ...typography.body, color: palette.white },
  basisText: { ...typography.caption, color: palette.muted },
  divider: { backgroundColor: palette.line, height: 1, marginVertical: spacing.xs },
  stack: { gap: spacing.sm },
  dimensionCard: { backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
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
  emptyCopy: { flex: 1, gap: 4 },
  emptyTitle: { ...typography.h3, color: palette.white },
  emptyText: { ...typography.body, color: palette.paperMuted, flex: 1 }
});
