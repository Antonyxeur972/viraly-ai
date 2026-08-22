import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useMemo, useState } from "react";
import {
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
import { videoChecklist } from "../data/viralInsights";
import { calculateViralityScore } from "../lib/viralScore";
import { palette, radius, spacing, typography } from "../theme";

export function VideoLabScreen() {
  const [selectedVideo, setSelectedVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const simulatedScore = useMemo(
    () =>
      calculateViralityScore({
        hookRate: selectedVideo ? 81 : 69,
        retention: selectedVideo ? 68 : 58,
        savesPerView: selectedVideo ? 0.052 : 0.033,
        sharesPerView: selectedVideo ? 0.021 : 0.013,
        revenueFit: selectedVideo ? 82 : 65
      }),
    [selectedVideo]
  );

  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1
    });

    if (!result.canceled) {
      setSelectedVideo(result.assets[0]);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.kicker}>Video Lab</Text>
        <Text style={styles.title}>Analyse une video avant de la publier.</Text>
        <Text style={styles.subtitle}>
          VIRALY AI regarde la promesse, le hook, la retention probable, les
          raisons d'enregistrer et le lien avec tes revenus.
        </Text>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        onPress={pickVideo}
        style={styles.uploadButton}
      >
        <View style={styles.uploadIcon}>
          <Ionicons color={palette.ink} name="cloud-upload-outline" size={24} />
        </View>
        <View style={styles.uploadCopy}>
          <Text style={styles.uploadTitle}>
            {selectedVideo ? "Video selectionnee" : "Choisir depuis la galerie"}
          </Text>
          <Text style={styles.uploadMeta}>
            {selectedVideo?.fileName ?? "MP4, MOV ou video issue du telephone"}
          </Text>
        </View>
        <Ionicons color={palette.muted} name="chevron-forward" size={20} />
      </TouchableOpacity>

      <ScoreDial
        caption={
          selectedVideo
            ? "Analyse de demonstration appliquee a la video choisie."
            : "Score exemple avant branchement du modele video."
        }
        color={selectedVideo ? palette.mint : palette.lemon}
        label={selectedVideo ? "Potentiel de publication" : "Exemple d'audit"}
        score={simulatedScore}
      />

      <SectionHeader eyebrow="Lecture rapide" title="Ce que l'IA verifiera" />
      <View style={styles.stack}>
        <ActionCard
          accent={palette.mint}
          body="La premiere phrase doit creer une tension visible : resultat, erreur, preuve ou transformation."
          icon="flash-outline"
          meta="0-3 sec"
          title="Hook"
        />
        <ActionCard
          accent={palette.sky}
          body="Le rythme doit changer avant la chute d'attention : coupe, zoom, texte ou exemple."
          icon="analytics-outline"
          meta="retention"
          title="Courbe d'attention"
        />
        <ActionCard
          accent={palette.coral}
          body="Chaque video doit pousser une action : enregistrer, commenter, visiter le profil, cliquer ou demander en DM."
          icon="navigate-outline"
          meta="trafic"
          title="Conversion"
        />
      </View>

      <SectionHeader eyebrow="Checklist" title="Avant d'appuyer sur publier" />
      <View style={styles.checklist}>
        {videoChecklist.map((item, index) => (
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
        {[
          ["Hook clair", 78, palette.mint],
          ["Preuve", 64, palette.lemon],
          ["Partage", 58, palette.coral],
          ["Revenu", 72, palette.sky]
        ].map(([label, value, color]) => (
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
