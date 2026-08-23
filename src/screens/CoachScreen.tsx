import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { SectionHeader } from "../components/SectionHeader";
import { coachQuestions } from "../data/viralInsights";
import { CoachReport, askCoach } from "../services/ai";
import { ProfileAnalysisReport } from "../services/profileAnalysis";
import { palette, radius, spacing, typography } from "../theme";
import { CreatorOnboardingProfile } from "../types";

type Props = {
  profile: CreatorOnboardingProfile;
  accountContext: ProfileAnalysisReport | null;
};

export function CoachScreen({ profile, accountContext }: Props) {
  const [question, setQuestion] = useState("");
  const [report, setReport] = useState<CoachReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (nextQuestion = question) => {
    const cleanQuestion = nextQuestion.trim();
    if (cleanQuestion.length < 3) return;
    setQuestion(cleanQuestion);
    setReport(null);
    setIsLoading(true);
    try {
      setReport(await askCoach(cleanQuestion, profile, accountContext));
    } catch (error) {
      Alert.alert("Coach VIRALY", error instanceof Error ? error.message : "Réponse indisponible.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.kicker}>COACH IA</Text>
        <Text style={styles.title}>Une décision, maintenant.</Text>
        <Text style={styles.subtitle}>Le coach utilise ton diagnostic et reconnaît clairement quand les données du compte manquent.</Text>
      </View>

      <View style={styles.askCard}>
        <TextInput
          multiline
          onChangeText={setQuestion}
          placeholder="Demande une heure de publication, une fréquence, un angle LIVE..."
          placeholderTextColor={palette.muted}
          style={styles.input}
          value={question}
        />
        <TouchableOpacity disabled={isLoading || question.trim().length < 3} onPress={() => submit()} style={[styles.askButton, question.trim().length < 3 && styles.disabled]}>
          <Ionicons color={palette.ink} name="arrow-up" size={19} />
          <Text style={styles.askText}>{isLoading ? "Analyse..." : "Demander au coach"}</Text>
        </TouchableOpacity>
      </View>

      <SectionHeader eyebrow="Questions utiles" title="Lancer une analyse ciblée" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRail}>
        {coachQuestions.map((item) => (
          <TouchableOpacity key={item.question} onPress={() => submit(item.question)} style={styles.quickCard}>
            <Ionicons color={palette.mint} name={item.icon} size={20} />
            <Text style={styles.quickText}>{item.question}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {report ? (
        <>
          <View style={styles.answerCard}>
            <View style={styles.answerTop}>
              <View style={styles.aiMark}><Ionicons color={palette.ink} name="sparkles" size={20} /></View>
              <Text style={styles.confidence}>Confiance {report.confidence}</Text>
            </View>
            <Text style={styles.answer}>{report.answer}</Text>
            <Text style={styles.why}>{report.why}</Text>
          </View>

          <SectionHeader eyebrow="Exécution" title="Actions recommandées" />
          <View style={styles.actions}>
            {report.actions.map((action, index) => (
              <View key={`${action}-${index}`} style={styles.actionCard}>
                <Text style={styles.actionIndex}>0{index + 1}</Text>
                <Text style={styles.actionText}>{action}</Text>
              </View>
            ))}
          </View>

          {report.calendarSuggestion ? (
            <View style={styles.calendarCard}>
              <Ionicons color={palette.lemon} name="calendar-outline" size={22} />
              <View style={styles.calendarCopy}>
                <Text style={styles.calendarLabel}>À PLACER AU CALENDRIER</Text>
                <Text style={styles.calendarText}>{report.calendarSuggestion}</Text>
              </View>
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons color={palette.mint} name="chatbubbles-outline" size={24} />
          <Text style={styles.emptyText}>Aucune réponse préécrite : chaque question lance une nouvelle analyse.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  header: { gap: spacing.sm },
  kicker: { ...typography.caption, color: palette.coral },
  title: { ...typography.title, color: palette.white },
  subtitle: { ...typography.body, color: palette.paperMuted },
  askCard: { backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, gap: spacing.md, padding: spacing.md },
  input: { ...typography.body, color: palette.white, minHeight: 88, textAlignVertical: "top" },
  askButton: { alignItems: "center", alignSelf: "flex-end", backgroundColor: palette.mint, borderRadius: radius.sm, flexDirection: "row", gap: spacing.xs, minHeight: 42, paddingHorizontal: spacing.md },
  askText: { ...typography.caption, color: palette.ink },
  disabled: { opacity: 0.45 },
  quickRail: { marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg },
  quickCard: { backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, gap: spacing.md, marginRight: spacing.sm, minHeight: 118, padding: spacing.md, width: 190 },
  quickText: { ...typography.h3, color: palette.white },
  answerCard: { backgroundColor: palette.panelSoft, borderColor: palette.mint, borderRadius: radius.md, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  answerTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  aiMark: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.sm, height: 38, justifyContent: "center", width: 38 },
  confidence: { ...typography.caption, color: palette.mint },
  answer: { ...typography.h2, color: palette.white },
  why: { ...typography.body, color: palette.paperMuted },
  actions: { gap: spacing.sm },
  actionCard: { alignItems: "flex-start", backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.sm, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  actionIndex: { ...typography.caption, color: palette.mint },
  actionText: { ...typography.body, color: palette.white, flex: 1 },
  calendarCard: { alignItems: "flex-start", backgroundColor: palette.panel, borderColor: palette.lemon, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  calendarCopy: { flex: 1, gap: 4 },
  calendarLabel: { ...typography.caption, color: palette.lemon },
  calendarText: { ...typography.body, color: palette.white },
  emptyCard: { alignItems: "center", backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  emptyText: { ...typography.body, color: palette.paperMuted, flex: 1 }
});
