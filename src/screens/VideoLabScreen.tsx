import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { ActionCard } from "../components/ActionCard";
import { ProgressBar } from "../components/ProgressBar";
import { ScoreDial } from "../components/ScoreDial";
import { SectionHeader } from "../components/SectionHeader";
import { carouselChecklist, videoChecklist } from "../data/viralInsights";
import { calculateViralityScore } from "../lib/viralScore";
import {
  ContentAnalysisReport,
  requestContentAnalysis
} from "../services/contentAnalysis";
import { palette, radius, spacing, typography } from "../theme";

export function VideoLabScreen() {
  const [mode, setMode] = useState<"video" | "carousel">("video");
  const [selectedAssets, setSelectedAssets] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [analysisReport, setAnalysisReport] = useState<ContentAnalysisReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const hasSelection = selectedAssets.length > 0;

  const simulatedScore = useMemo(
    () =>
      calculateViralityScore({
        hookRate: hasSelection ? (mode === "carousel" ? 84 : 81) : 69,
        retention: hasSelection ? (mode === "carousel" ? 74 : 68) : 58,
        savesPerView: hasSelection ? (mode === "carousel" ? 0.064 : 0.052) : 0.033,
        sharesPerView: hasSelection ? 0.021 : 0.013,
        revenueFit: hasSelection ? 82 : 65
      }),
    [hasSelection, mode]
  );

  const analysisRows =
    mode === "video"
      ? [
          ["Hook 0-2s", hasSelection ? 81 : 69, palette.mint],
          ["Rythme", hasSelection ? 68 : 58, palette.lemon],
          ["Partage", hasSelection ? 62 : 54, palette.coral],
          ["Conversion", hasSelection ? 82 : 65, palette.sky]
        ]
      : [
          ["Couverture", hasSelection ? 84 : 67, palette.mint],
          ["Progression", hasSelection ? 76 : 60, palette.lemon],
          ["Lisibilite", hasSelection ? 79 : 62, palette.sky],
          ["CTA final", hasSelection ? 73 : 58, palette.coral]
        ];
  const activeChecklist = mode === "video" ? videoChecklist : carouselChecklist;

  const selectMode = (nextMode: "video" | "carousel") => {
    setMode(nextMode);
    setSelectedAssets([]);
    setAnalysisReport(null);
  };

  const pickContent = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: mode === "carousel",
      mediaTypes:
        mode === "video"
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.Images,
      selectionLimit: mode === "carousel" ? 10 : 1,
      quality: 1
    });

    if (!result.canceled) {
      setSelectedAssets(result.assets);
      setAnalysisReport(null);
    }
  };

  const analyzeContent = async () => {
    setIsAnalyzing(true);

    try {
      const remoteReport = await requestContentAnalysis(mode, selectedAssets);
      setAnalysisReport(
        remoteReport || {
          score: simulatedScore,
          summary:
            mode === "video"
              ? "Pre-audit local termine. Le format peut convertir si la preuve arrive avant le CTA."
              : "Pre-audit local termine. La couverture et la derniere slide portent la conversion.",
          revenueCta:
            "Relie le CTA a une seule prochaine etape : profil, lien, DM, LIVE ou produit.",
          improvements:
            mode === "video"
              ? ["Raccourcir l'introduction", "Montrer une preuve", "Nommer le benefice du CTA"]
              : ["Renforcer la couverture", "Ajouter une slide preuve", "Finir par une action mesurable"]
        }
      );
    } catch (error) {
      Alert.alert(
        "Analyse du contenu",
        error instanceof Error ? error.message : "L'analyse n'a pas abouti."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.kicker}>Content Lab</Text>
        <Text style={styles.title}>Analyse avant de publier.</Text>
        <Text style={styles.subtitle}>
          Video ou carrousel : VIRALY AI relie la structure, l'attention, les
          sauvegardes et le CTA au revenu recherche.
        </Text>
      </View>

      <View style={styles.segmentedControl}>
        {(["video", "carousel"] as const).map((item) => (
          <TouchableOpacity
            accessibilityRole="button"
            key={item}
            onPress={() => selectMode(item)}
            style={[styles.segment, mode === item && styles.segmentActive]}
          >
            <Ionicons
              color={mode === item ? palette.ink : palette.paperMuted}
              name={item === "video" ? "videocam-outline" : "images-outline"}
              size={18}
            />
            <Text style={[styles.segmentText, mode === item && styles.segmentTextActive]}>
              {item === "video" ? "Video" : "Carrousel"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        onPress={pickContent}
        style={styles.uploadButton}
      >
        <View style={styles.uploadIcon}>
          <Ionicons color={palette.ink} name="cloud-upload-outline" size={24} />
        </View>
        <View style={styles.uploadCopy}>
          <Text style={styles.uploadTitle}>
            {hasSelection
              ? mode === "video"
                ? "Video prete a analyser"
                : `${selectedAssets.length} photos selectionnees`
              : "Choisir depuis la galerie"}
          </Text>
          <Text style={styles.uploadMeta}>
            {selectedAssets[0]?.fileName ??
              (mode === "video" ? "MP4 ou MOV" : "2 a 10 images conseillees")}
          </Text>
        </View>
        <Ionicons color={palette.muted} name="chevron-forward" size={20} />
      </TouchableOpacity>

      {mode === "carousel" && hasSelection ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewRail}>
          {selectedAssets.map((asset, index) => (
            <View key={`${asset.uri}-${index}`} style={styles.previewItem}>
              <Image source={{ uri: asset.uri }} style={styles.previewImage} />
              <Text style={styles.previewIndex}>{index + 1}</Text>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {hasSelection ? (
        <TouchableOpacity
          accessibilityRole="button"
          disabled={isAnalyzing}
          onPress={analyzeContent}
          style={styles.analyzeButton}
        >
          <Ionicons color={palette.ink} name="sparkles-outline" size={19} />
          <Text style={styles.analyzeText}>
            {isAnalyzing ? "Analyse en cours..." : "Analyser le potentiel et le revenu"}
          </Text>
        </TouchableOpacity>
      ) : null}

      <ScoreDial
        caption={
          hasSelection
            ? mode === "video"
              ? "Pre-audit du hook, du rythme et du chemin de conversion."
              : "Pre-audit de la couverture, de la progression et du CTA final."
            : "Selectionne un contenu pour lancer le pre-audit."
        }
        color={hasSelection ? palette.mint : palette.lemon}
        label={hasSelection ? "Potentiel de publication" : "Audit en attente"}
        score={analysisReport?.score ?? simulatedScore}
      />

      {analysisReport ? (
        <View style={styles.reportCard}>
          <Text style={styles.reportTitle}>Diagnostic VIRALY AI</Text>
          <Text style={styles.reportSummary}>{analysisReport.summary}</Text>
          {analysisReport.improvements.map((improvement) => (
            <View key={improvement} style={styles.reportLine}>
              <Ionicons color={palette.mint} name="arrow-forward-circle" size={18} />
              <Text style={styles.reportText}>{improvement}</Text>
            </View>
          ))}
          <Text style={styles.reportCta}>{analysisReport.revenueCta}</Text>
        </View>
      ) : null}

      <SectionHeader eyebrow="Lecture rapide" title="Ce que l'IA verifiera" />
      <View style={styles.stack}>
        <ActionCard
          accent={palette.mint}
          body={
            mode === "video"
              ? "La premiere phrase doit creer une tension visible : resultat, erreur, preuve ou transformation."
              : "La couverture doit promettre un resultat lisible sans ouvrir la legende."
          }
          icon="flash-outline"
          meta={mode === "video" ? "0-3 sec" : "slide 1"}
          title={mode === "video" ? "Hook" : "Couverture"}
        />
        <ActionCard
          accent={palette.sky}
          body={
            mode === "video"
              ? "Le rythme doit changer avant la chute d'attention : coupe, zoom, texte ou exemple."
              : "Chaque slide doit faire avancer une seule idee et donner envie de swiper."
          }
          icon="analytics-outline"
          meta={mode === "video" ? "retention" : "slides 2-8"}
          title={mode === "video" ? "Courbe d'attention" : "Progression"}
        />
        <ActionCard
          accent={palette.coral}
          body="Le contenu doit pousser une action mesurable : enregistrer, commenter, visiter le profil, cliquer ou demander en DM."
          icon="navigate-outline"
          meta="trafic"
          title="Conversion"
        />
      </View>

      <SectionHeader eyebrow="Checklist" title="Avant d'appuyer sur publier" />
      <View style={styles.checklist}>
        {activeChecklist.map((item, index) => (
          <View key={item} style={styles.checkItem}>
            <View style={styles.checkIndex}>
              <Text style={styles.checkNumber}>{index + 1}</Text>
            </View>
            <Text style={styles.checkText}>{item}</Text>
          </View>
        ))}
      </View>

      <SectionHeader eyebrow="Radar" title="Ce qui manque souvent" />
      <View style={styles.radar}>
        {analysisRows.map(([label, value, color]) => (
          <View key={label as string} style={styles.radarRow}>
            <Text style={styles.radarLabel}>{label}</Text>
            <ProgressBar color={color as string} value={value as number} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl
  },
  header: {
    gap: spacing.sm
  },
  kicker: {
    ...typography.caption,
    color: palette.mint
  },
  title: {
    ...typography.title,
    color: palette.white
  },
  subtitle: {
    ...typography.body,
    color: palette.paperMuted
  },
  segmentedControl: {
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    padding: 4
  },
  segment: {
    alignItems: "center",
    borderRadius: radius.sm,
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 44
  },
  segmentActive: {
    backgroundColor: palette.mint
  },
  segmentText: {
    ...typography.caption,
    color: palette.paperMuted
  },
  segmentTextActive: {
    color: palette.ink
  },
  uploadButton: {
    alignItems: "center",
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 86,
    padding: spacing.md
  },
  uploadIcon: {
    alignItems: "center",
    backgroundColor: palette.mint,
    borderRadius: radius.md,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  uploadCopy: {
    flex: 1,
    gap: 4
  },
  uploadTitle: {
    ...typography.h3,
    color: palette.white
  },
  uploadMeta: {
    ...typography.caption,
    color: palette.muted
  },
  previewRail: {
    flexGrow: 0
  },
  previewItem: {
    marginRight: spacing.sm,
    position: "relative"
  },
  previewImage: {
    backgroundColor: palette.panel,
    borderRadius: radius.sm,
    height: 130,
    width: 96
  },
  previewIndex: {
    backgroundColor: palette.ink,
    borderRadius: radius.pill,
    color: palette.white,
    fontSize: 11,
    fontWeight: "800",
    height: 24,
    lineHeight: 24,
    position: "absolute",
    right: 6,
    textAlign: "center",
    top: 6,
    width: 24
  },
  analyzeButton: {
    alignItems: "center",
    backgroundColor: palette.mint,
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: spacing.md
  },
  analyzeText: {
    ...typography.caption,
    color: palette.ink
  },
  reportCard: {
    backgroundColor: palette.graphite,
    borderColor: palette.mint,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg
  },
  reportTitle: {
    ...typography.h3,
    color: palette.white
  },
  reportSummary: {
    ...typography.body,
    color: palette.paperMuted
  },
  reportLine: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm
  },
  reportText: {
    ...typography.body,
    color: palette.white,
    flex: 1
  },
  reportCta: {
    ...typography.caption,
    color: palette.lemon,
    marginTop: spacing.xs
  },
  stack: {
    gap: spacing.md
  },
  checklist: {
    backgroundColor: palette.paper,
    borderRadius: radius.md,
    gap: spacing.sm,
    padding: spacing.md
  },
  checkItem: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.sm
  },
  checkIndex: {
    alignItems: "center",
    backgroundColor: palette.ink,
    borderRadius: radius.pill,
    height: 26,
    justifyContent: "center",
    marginTop: 1,
    width: 26
  },
  checkNumber: {
    ...typography.caption,
    color: palette.white
  },
  checkText: {
    ...typography.body,
    color: palette.ink,
    flex: 1
  },
  radar: {
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  radarRow: {
    gap: spacing.xs
  },
  radarLabel: {
    ...typography.caption,
    color: palette.paperMuted
  }
});
