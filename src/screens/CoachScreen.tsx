import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { GlassPanel } from "../components/GlassPanel";
import { NeonButton } from "../components/NeonButton";
import { ReadableText } from "../components/ReadableText";
import { ScreenHero } from "../components/ScreenHero";
import { SectionHeader } from "../components/SectionHeader";
import { coachQuestions } from "../data/viralInsights";
import { CoachReport, ContentPlan, askCoach, listContentPlans } from "../services/ai";
import {
  AnalysisHistoryItem,
  deleteAnalysisHistory,
  listAnalysisHistory
} from "../services/analysisHistory";
import { ProfileAnalysisReport } from "../services/profileAnalysis";
import { palette, radius, spacing, typography } from "../theme";
import { CreatorOnboardingProfile } from "../types";

type Props = {
  profile: CreatorOnboardingProfile;
  accountContext: ProfileAnalysisReport | null;
};

export function CoachScreen({ profile, accountContext }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const [question, setQuestion] = useState("");
  const [report, setReport] = useState<CoachReport | null>(null);
  const [history, setHistory] = useState<AnalysisHistoryItem<CoachReport>[]>([]);
  const [currentPlan, setCurrentPlan] = useState<ContentPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [answerY, setAnswerY] = useState(0);
  const niche = profile.nicheTopic || profile.niche || "ta niche";

  useEffect(() => {
    listContentPlans(1)
      .then((plans) => setCurrentPlan(plans[0] || null))
      .catch(() => {});
    listAnalysisHistory<CoachReport>("coach", 20)
      .then(setHistory)
      .catch(() => {});
  }, []);

  const showReport = (nextReport: CoachReport) => {
    setReport(nextReport);
    setQuestion(nextReport.question || "");
    setTimeout(() => scrollRef.current?.scrollTo({ animated: true, y: Math.max(0, answerY - spacing.lg) }), 120);
  };

  const submit = async (nextQuestion = question) => {
    const cleanQuestion = nextQuestion.trim();
    if (cleanQuestion.length < 3) return;
    setQuestion(cleanQuestion);
    setReport(null);
    setIsLoading(true);
    try {
      const nextReport = await askCoach(cleanQuestion, profile, accountContext, currentPlan);
      setReport(nextReport);
      setHistory((current) => [
        {
          id: nextReport.analysisId,
          kind: "coach",
          createdAt: new Date().toISOString(),
          report: nextReport
        },
        ...current.filter((item) => item.id !== nextReport.analysisId)
      ].slice(0, 20));
    } catch (error) {
      Alert.alert("Coach VIRALY", error instanceof Error ? error.message : "Réponse indisponible.");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelete = (item: AnalysisHistoryItem<CoachReport>) => {
    Alert.alert(
      "Supprimer cette réponse ?",
      "La question et les conseils du coach seront retirés de ton historique.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            deleteAnalysisHistory(item.id)
              .then(() => {
                setHistory((current) => current.filter((entry) => entry.id !== item.id));
                if (report?.analysisId === item.id) setReport(null);
              })
              .catch((error) => Alert.alert("Historique", error instanceof Error ? error.message : "Suppression impossible."));
          }
        }
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.content} ref={scrollRef} showsVerticalScrollIndicator={false}>
      <ScreenHero
        eyebrow="Coach stratégique"
        icon="chatbubble-ellipses-outline"
        subtitle="Le coach relie chaque conseil à ton profil, aux signaux observés et à un test mesurable."
        title={<>Une réponse qui <Text style={styles.titleAccent}>tranche.</Text></>}
      />

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

      <GlassPanel glow style={styles.askCard} textureOpacity={0.16}>
        <Text style={styles.askLabel}>TA QUESTION</Text>
        <TextInput
          multiline
          onChangeText={setQuestion}
          placeholder="Ex : quel angle dois-je publier cette semaine pour obtenir plus de sauvegardes ?"
          placeholderTextColor={palette.muted}
          style={styles.input}
          value={question}
        />
        <NeonButton
          disabled={isLoading || question.trim().length < 3}
          icon="arrow-up"
          onPress={() => submit()}
          title={isLoading ? "Analyse du contexte..." : "Demander au coach"}
        />
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

      <View onLayout={(event) => setAnswerY(event.nativeEvent.layout.y)}>
      {report ? (
        <View style={styles.answerSection}>
          <GlassPanel style={styles.answerCard} textureOpacity={0.2}>
            <View style={styles.answerTop}>
              <View style={styles.aiMark}><Ionicons color={palette.ink} name="sparkles" size={20} /></View>
              <View style={styles.answerMeta}>
                <Text style={styles.answerBy}>VIRALY COACH</Text>
                <Text style={styles.confidence}>Confiance {report.confidence}</Text>
              </View>
            </View>
            <ReadableText text={report.answer} textStyle={styles.answer} />
            <View style={styles.divider} />
            <Text style={styles.whyLabel}>POURQUOI CETTE DÉCISION</Text>
            <ReadableText text={report.why} textStyle={styles.why} />
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
                <ReadableText text={report.calendarSuggestion} textStyle={styles.calendarText} />
              </View>
            </GlassPanel>
          ) : null}
        </View>
      ) : !isLoading ? (
        <GlassPanel style={styles.emptyCard} textureOpacity={0.08}>
          <Ionicons color={palette.mint} name="chatbubble-ellipses-outline" size={24} />
          <View style={styles.emptyCopy}>
            <Text style={styles.emptyTitle}>Prêt à décider avec toi</Text>
            <Text style={styles.emptyText}>Chaque question déclenche une nouvelle analyse, sans réponse préécrite affichée comme un conseil personnalisé.</Text>
          </View>
        </GlassPanel>
      ) : null}
      </View>

      <SectionHeader eyebrow="Mémoire du coach" title="Réponses enregistrées" action={`${history.length}`} />
      {history.length ? (
        <View style={styles.historyList}>
          {history.map((item) => (
            <View key={item.id} style={[styles.historyRow, report?.analysisId === item.id && styles.historyRowActive]}>
              <TouchableOpacity onPress={() => showReport(item.report)} style={styles.historyOpen}>
                <View style={styles.historyIcon}><Ionicons color={palette.mint} name="chatbubble-ellipses-outline" size={18} /></View>
                <View style={styles.historyCopy}>
                  <Text numberOfLines={2} style={styles.historyQuestion}>{item.report.question || "Question au coach VIRALY"}</Text>
                  <Text style={styles.historyDate}>{new Intl.DateTimeFormat("fr-FR", { day: "2-digit", hour: "2-digit", minute: "2-digit", month: "short" }).format(new Date(item.createdAt))}</Text>
                  <Text numberOfLines={2} style={styles.historyAnswer}>{item.report.answer}</Text>
                  <Text style={styles.historyRead}>Lire la réponse complète</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity accessibilityLabel="Supprimer cette réponse" onPress={() => confirmDelete(item)} style={styles.historyDelete}>
                <Ionicons color={palette.muted} name="trash-outline" size={18} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.historyEmpty}>
          <Ionicons color={palette.muted} name="time-outline" size={19} />
          <Text style={styles.historyEmptyText}>Tes prochaines réponses seront conservées ici.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.lg },
  header: { gap: spacing.sm },
  coachBadge: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.pill, height: 46, justifyContent: "center", marginBottom: spacing.sm, width: 46 },
  kicker: { ...typography.caption, color: palette.mint },
  title: { ...typography.title, color: palette.white },
  titleAccent: { color: palette.electric },
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
  answerSection: { gap: spacing.xl },
  answerTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  aiMark: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.pill, height: 42, justifyContent: "center", width: 42 },
  answerMeta: { flex: 1, gap: 2 },
  answerBy: { ...typography.caption, color: palette.white },
  confidence: { ...typography.caption, color: palette.mint },
  answer: { color: palette.white, fontSize: 18, fontWeight: "700", lineHeight: 25 },
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
  emptyText: { ...typography.body, color: palette.paperMuted },
  historyList: { gap: spacing.sm },
  historyRow: { alignItems: "stretch", backgroundColor: "rgba(7,17,38,0.72)", borderRadius: radius.md, flexDirection: "row", minHeight: 126, overflow: "hidden" },
  historyRowActive: { backgroundColor: "rgba(24,67,139,0.42)" },
  historyOpen: { alignItems: "flex-start", flex: 1, flexDirection: "row", gap: spacing.md, padding: spacing.md },
  historyIcon: { alignItems: "center", backgroundColor: "rgba(45,124,255,0.13)", borderRadius: radius.pill, height: 38, justifyContent: "center", width: 38 },
  historyCopy: { flex: 1, gap: 4, minWidth: 0 },
  historyQuestion: { ...typography.h3, color: palette.white },
  historyDate: { color: palette.muted, fontSize: 10, lineHeight: 14 },
  historyAnswer: { color: palette.paperMuted, fontSize: 12, lineHeight: 17 },
  historyRead: { color: palette.mint, fontSize: 10, fontWeight: "800", marginTop: 2 },
  historyDelete: { alignItems: "center", backgroundColor: "rgba(3,10,27,0.28)", justifyContent: "center", width: 46 },
  historyEmpty: { alignItems: "center", backgroundColor: "rgba(7,17,38,0.38)", borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, minHeight: 64, paddingHorizontal: spacing.md },
  historyEmptyText: { ...typography.caption, color: palette.muted, flex: 1 }
});
