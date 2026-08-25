import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { GlassPanel } from "../components/GlassPanel";
import { SectionHeader } from "../components/SectionHeader";
import { coachQuestions } from "../data/viralInsights";
import { CoachReport, ContentPlan, askCoach, listContentPlans } from "../services/ai";
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
  const [currentPlan, setCurrentPlan] = useState<ContentPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const niche = profile.nicheTopic || profile.niche || "ta niche";

  useEffect(() => {
    listContentPlans(1)
      .then((plans) => setCurrentPlan(plans[0] || null))
      .catch(() => {});
  }, []);

  const submit = async (nextQuestion = question) => {
    const cleanQuestion = nextQuestion.trim();
    if (cleanQuestion.length < 3) return;
    setQuestion(cleanQuestion);
    setReport(null);
    setIsLoading(true);
    try {
      setReport(await askCoach(cleanQuestion, profile, accountContext, currentPlan));
    } catch (error) {
      Alert.alert("Coach VIRALY", error instanceof Error ? error.message : "Réponse indisponible.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.coachBadge}><Ionicons color={palette.ink} name="sparkles" size={22} /></View>
        <Text style={styles.kicker}>COACH STRATÉGIQUE</Text>
        <Text style={styles.title}>Une réponse qui tranche.</Text>
        <Text style={styles.subtitle}>Le coach relie chaque conseil à ton profil, aux signaux observés et à un test mesurable.</Text>
      </View>

      <GlassPanel style={styles.contextPanel} textureOpacity={0.08}>
        <View style={styles.contextTop}>
          <Text style={styles.contextLabel}>CONTEXTE ACTIF</Text>
          <View style={styles.liveDot} />
        </View>
        <Text numberOfLines={2} style={styles.contextTitle}>{niche}</Text>
        <Text style={styles.contextMeta}>{accountContext ? `Diagnostic compte chargé · score ${accountContext.score}/100` : "Profil créateur chargé · diagnostic compte non disponible"}</Text>
        {currentPlan ? (
          <Text style={styles.planMeta}>Plan actif · {currentPlan.contentMix.videos} vidéos · {currentPlan.contentMix.carousels} carrousels · {currentPlan.contentMix.stories} stories</Text>
        ) : null}
      </GlassPanel>

      <GlassPanel style={styles.askCard} textureOpacity={0.16}>
        <Text style={styles.askLabel}>TA QUESTION</Text>
        <TextInput
          multiline
          onChangeText={setQuestion}
          placeholder="Ex : quel angle dois-je publier cette semaine pour obtenir plus de sauvegardes ?"
          placeholderTextColor={palette.muted}
          style={styles.input}
          value={question}
        />
        <TouchableOpacity disabled={isLoading || question.trim().length < 3} onPress={() => submit()} style={[styles.askButton, (question.trim().length < 3 || isLoading) && styles.disabled]}>
          <Text style={styles.askText}>{isLoading ? "Analyse du contexte en cours..." : "Demander au coach"}</Text>
          <Ionicons color={palette.ink} name="arrow-up" size={19} />
        </TouchableOpacity>
      </GlassPanel>

      <SectionHeader eyebrow="Raccourcis utiles" title="Choisir une décision" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRail}>
        {coachQuestions.map((item) => (
          <TouchableOpacity disabled={isLoading} key={item.question} onPress={() => submit(item.question)} style={styles.quickCard}>
            <View style={styles.quickIcon}><Ionicons color={palette.mint} name={item.icon} size={20} /></View>
            <Text style={styles.quickText}>{item.question}</Text>
            <Ionicons color={palette.muted} name="arrow-forward" size={17} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <GlassPanel style={styles.loadingPanel} textureOpacity={0.18}>
          <View style={styles.loadingMark}><Ionicons color={palette.ink} name="sparkles" size={20} /></View>
          <View style={styles.loadingCopy}>
            <Text style={styles.loadingTitle}>Le coach construit sa réponse</Text>
            <Text style={styles.loadingText}>Il compare ta question, ta niche, ton diagnostic et le plan actif avant de proposer une action.</Text>
          </View>
        </GlassPanel>
      ) : null}

      {report ? (
        <>
          <GlassPanel style={styles.answerCard} textureOpacity={0.2}>
            <View style={styles.answerTop}>
              <View style={styles.aiMark}><Ionicons color={palette.ink} name="sparkles" size={20} /></View>
              <View style={styles.answerMeta}>
                <Text style={styles.answerBy}>VIRALY COACH</Text>
                <Text style={styles.confidence}>Confiance {report.confidence}</Text>
              </View>
            </View>
            <Text style={styles.answer}>{report.answer}</Text>
            <View style={styles.divider} />
            <Text style={styles.whyLabel}>POURQUOI CETTE DÉCISION</Text>
            <Text style={styles.why}>{report.why}</Text>
          </GlassPanel>

          <SectionHeader eyebrow="Exécution" title="Tes prochaines actions" />
          <View style={styles.actions}>
            {report.actions.map((action, index) => (
              <View key={`${action}-${index}`} style={styles.actionCard}>
                <View style={styles.actionIndex}><Text style={styles.actionNumber}>{index + 1}</Text></View>
                <Text style={styles.actionText}>{action}</Text>
              </View>
            ))}
          </View>

          {report.calendarSuggestion ? (
            <GlassPanel style={styles.calendarCard} textureOpacity={0.08}>
              <View style={styles.calendarIcon}><Ionicons color={palette.mint} name="calendar-outline" size={22} /></View>
              <View style={styles.calendarCopy}>
                <Text style={styles.calendarLabel}>À PLACER DANS TON PLAN</Text>
                <Text style={styles.calendarText}>{report.calendarSuggestion}</Text>
              </View>
            </GlassPanel>
          ) : null}
        </>
      ) : !isLoading ? (
        <GlassPanel style={styles.emptyCard} textureOpacity={0.08}>
          <Ionicons color={palette.mint} name="chatbubble-ellipses-outline" size={24} />
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>Prêt à décider avec toi</Text>
            <Text style={styles.emptyText}>Chaque question déclenche une nouvelle analyse, sans réponse préécrite affichée comme un conseil personnalisé.</Text>
          </View>
        </GlassPanel>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.lg },
  header: { gap: spacing.sm },
  coachBadge: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.pill, height: 46, justifyContent: "center", marginBottom: spacing.sm, width: 46 },
  kicker: { ...typography.caption, color: palette.mint },
  title: { ...typography.title, color: palette.white },
  subtitle: { ...typography.body, color: palette.paperMuted },
  contextPanel: { gap: spacing.xs, padding: spacing.lg },
  contextTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  contextLabel: { ...typography.caption, color: palette.mint },
  liveDot: { backgroundColor: palette.mint, borderRadius: radius.pill, height: 8, width: 8 },
  contextTitle: { ...typography.h3, color: palette.white, textTransform: "capitalize" },
  contextMeta: { ...typography.caption, color: palette.muted },
  planMeta: { ...typography.caption, color: palette.sky, marginTop: spacing.xs },
  askCard: { gap: spacing.md, padding: spacing.lg },
  askLabel: { ...typography.caption, color: palette.mint },
  input: { ...typography.body, backgroundColor: palette.graphite, borderColor: palette.line, borderRadius: radius.sm, borderWidth: 1, color: palette.white, minHeight: 110, padding: spacing.md, textAlignVertical: "top" },
  askButton: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.pill, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 52, paddingHorizontal: spacing.lg },
  askText: { ...typography.caption, color: palette.ink, textAlign: "center" },
  disabled: { opacity: 0.42 },
  quickRail: { marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg },
  quickCard: { alignItems: "center", backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, marginRight: spacing.sm, minHeight: 88, padding: spacing.md, width: 250 },
  quickIcon: { alignItems: "center", borderColor: palette.lineStrong, borderRadius: radius.pill, borderWidth: 1, height: 38, justifyContent: "center", width: 38 },
  quickText: { color: palette.white, flex: 1, fontSize: 14, fontWeight: "600", lineHeight: 19 },
  loadingPanel: { alignItems: "center", flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  loadingMark: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.pill, height: 44, justifyContent: "center", width: 44 },
  loadingCopy: { flex: 1, gap: 4 },
  loadingTitle: { ...typography.h3, color: palette.white },
  loadingText: { ...typography.caption, color: palette.paperMuted },
  answerCard: { borderColor: palette.lineStrong, gap: spacing.md, padding: spacing.xl },
  answerTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  aiMark: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.pill, height: 42, justifyContent: "center", width: 42 },
  answerMeta: { flex: 1, gap: 2 },
  answerBy: { ...typography.caption, color: palette.white },
  confidence: { ...typography.caption, color: palette.mint },
  answer: { ...typography.h2, color: palette.white },
  divider: { backgroundColor: palette.line, height: 1 },
  whyLabel: { ...typography.caption, color: palette.mint },
  why: { ...typography.body, color: palette.paperMuted },
  actions: { gap: spacing.sm },
  actionCard: { alignItems: "flex-start", backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.sm, borderWidth: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  actionIndex: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.pill, height: 30, justifyContent: "center", width: 30 },
  actionNumber: { color: palette.ink, fontSize: 11, fontWeight: "800" },
  actionText: { ...typography.body, color: palette.white, flex: 1 },
  calendarCard: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  calendarIcon: { alignItems: "center", borderColor: palette.lineStrong, borderRadius: radius.pill, borderWidth: 1, height: 42, justifyContent: "center", width: 42 },
  calendarCopy: { flex: 1, gap: 4 },
  calendarLabel: { ...typography.caption, color: palette.mint },
  calendarText: { ...typography.body, color: palette.white },
  emptyCard: { alignItems: "center", flexDirection: "row", gap: spacing.md, padding: spacing.lg },
  emptyCopy: { flex: 1, gap: 4 },
  emptyTitle: { ...typography.h3, color: palette.white },
  emptyText: { ...typography.body, color: palette.paperMuted }
});
