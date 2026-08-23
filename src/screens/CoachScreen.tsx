import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { ActionCard } from "../components/ActionCard";
import { SectionHeader } from "../components/SectionHeader";
import { coachQuestions } from "../data/viralInsights";
import { palette, radius, spacing, typography } from "../theme";

export function CoachScreen() {
  const [selectedQuestion, setSelectedQuestion] = useState(coachQuestions[0].question);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.kicker}>Coach</Text>
        <Text style={styles.title}>Des conseils simples, relies a tes actions.</Text>
        <Text style={styles.subtitle}>
          Le coach repond aux questions qui ralentissent souvent les createurs,
          puis transforme la reponse en prochaine action.
        </Text>
      </View>

      <SectionHeader eyebrow="Questions frequentes" title="Ce que les createurs se demandent" />
      <View style={styles.questionList}>
        {coachQuestions.map((item) => {
          const selected = item.question === selectedQuestion;
          return (
            <TouchableOpacity
              accessibilityRole="button"
              key={item.question}
              onPress={() => setSelectedQuestion(item.question)}
              style={[styles.questionCard, selected && styles.questionCardActive]}
            >
              <View
                style={[
                  styles.questionIcon,
                  selected && styles.questionIconActive
                ]}
              >
                <Ionicons
                  color={selected ? palette.ink : palette.mint}
                  name={item.icon}
                  size={20}
                />
              </View>
              <View style={styles.questionCopy}>
                <Text style={[styles.question, selected && styles.questionActive]}>
                  {item.question}
                </Text>
                {selected ? (
                  <>
                    <Text style={styles.answer}>{item.shortAnswer}</Text>
                    <Text style={styles.action}>Action : {item.action}</Text>
                  </>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <SectionHeader eyebrow="48 heures" title="Mini plan executable" />
      <View style={styles.stack}>
        <ActionCard
          accent={palette.mint}
          body="Choisis une idee avec promesse forte, ecris 3 hooks, filme 2 variantes."
          icon="create-outline"
          meta="jour 1"
          title="Produire sans attendre"
        />
        <ActionCard
          accent={palette.lemon}
          body="Publie au creneau A, puis reponds aux commentaires avec des questions utiles."
          icon="send-outline"
          meta="jour 2"
          title="Poster puis amplifier"
        />
        <ActionCard
          accent={palette.coral}
          body="Note hook, retention, sauvegardes, commentaires et DM. Garde seulement les formats avec signal."
          icon="stats-chart-outline"
          meta="mesure"
          title="Apprendre vite"
        />
      </View>

      <View style={styles.principleCard}>
        <Text style={styles.principleTitle}>Regle VIRALY</Text>
        <Text style={styles.principleBody}>
          Une niche devient interessante quand tu peux repeter le sujet sans
          repeter la meme video : angles, preuves, histoires, erreurs, outils,
          resultats et objections.
        </Text>
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
    color: palette.coral
  },
  title: {
    ...typography.title,
    color: palette.white
  },
  subtitle: {
    ...typography.body,
    color: palette.paperMuted
  },
  questionList: {
    gap: spacing.md
  },
  questionCard: {
    alignItems: "flex-start",
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  questionCardActive: {
    backgroundColor: palette.panelSoft,
    borderColor: palette.mint
  },
  questionIcon: {
    alignItems: "center",
    backgroundColor: palette.graphite,
    borderRadius: radius.sm,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  questionIconActive: {
    backgroundColor: palette.mint
  },
  questionCopy: {
    flex: 1,
    gap: spacing.xs
  },
  question: {
    ...typography.h3,
    color: palette.white
  },
  questionActive: {
    color: palette.white
  },
  answer: {
    ...typography.body,
    color: palette.paperMuted
  },
  action: {
    ...typography.caption,
    color: palette.mint
  },
  stack: {
    gap: spacing.md
  },
  principleCard: {
    backgroundColor: palette.mint,
    borderRadius: radius.lg,
    gap: spacing.sm,
    padding: spacing.lg
  },
  principleTitle: {
    ...typography.h2,
    color: palette.ink
  },
  principleBody: {
    ...typography.body,
    color: palette.ink
  }
});
