import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { GlassPanel } from "../components/GlassPanel";
import { ProgressBar } from "../components/ProgressBar";
import { analyzeOnboarding, OnboardingAIReport } from "../services/ai";
import { palette, radius, spacing, typography } from "../theme";
import {
  CreatorOnboardingProfile,
  GoogleConnectionStatus,
  IconName
} from "../types";

type Option = {
  id: string;
  label: string;
  detail: string;
  icon: IconName;
};

type Question = {
  id: keyof CreatorOnboardingProfile;
  eyebrow: string;
  title: string;
  subtitle: string;
  options: Option[];
};

const questions: Question[] = [
  {
    id: "goal",
    eyebrow: "AMBITION",
    title: "Qu'est-ce qui doit changer en premier ?",
    subtitle: "VIRALY AI adaptera les recommandations à ce résultat.",
    options: [
      { id: "reach", label: "Plus de vues", detail: "Étendre la portée et sortir du premier palier.", icon: "trending-up-outline" },
      { id: "community", label: "Plus d'abonnés", detail: "Construire une audience qui revient.", icon: "people-outline" },
      { id: "traffic", label: "Plus de trafic", detail: "Diriger l'attention vers un lien ou une offre.", icon: "navigate-outline" },
      { id: "revenue", label: "Plus de revenus", detail: "Relier chaque format à une monétisation.", icon: "cash-outline" }
    ]
  },
  {
    id: "niche",
    eyebrow: "POSITIONNEMENT",
    title: "Où en est ta niche ?",
    subtitle: "Pas besoin d'avoir déjà tout décidé.",
    options: [
      { id: "clear", label: "Elle est claire", detail: "Mon sujet et mon audience sont définis.", icon: "checkmark-circle-outline" },
      { id: "broad", label: "Encore trop large", detail: "J'ai un thème, mais pas un angle précis.", icon: "contract-outline" },
      { id: "hesitating", label: "J'hésite", detail: "Plusieurs niches semblent possibles.", icon: "git-branch-outline" },
      { id: "none", label: "Je pars de zéro", detail: "Je veux identifier une niche rentable.", icon: "compass-outline" }
    ]
  },
  {
    id: "followers",
    eyebrow: "POINT DE DÉPART",
    title: "Combien d'abonnés aujourd'hui ?",
    subtitle: "Une estimation suffit pour calibrer le plan.",
    options: [
      { id: "0-100", label: "0 à 100", detail: "Compte neuf ou presque.", icon: "leaf-outline" },
      { id: "100-1000", label: "100 à 1 000", detail: "Premiers signaux d'audience.", icon: "pulse-outline" },
      { id: "1000-10000", label: "1 000 à 10 000", detail: "Traction à structurer.", icon: "rocket-outline" },
      { id: "10000+", label: "Plus de 10 000", detail: "Audience à convertir et monétiser.", icon: "diamond-outline" }
    ]
  },
  {
    id: "cadence",
    eyebrow: "RYTHME",
    title: "Quelle cadence peux-tu tenir ?",
    subtitle: "On construit un système réaliste, pas une promesse impossible.",
    options: [
      { id: "1-2", label: "1 à 2 par semaine", detail: "Priorité à la précision.", icon: "calendar-outline" },
      { id: "3-4", label: "3 à 4 par semaine", detail: "Rythme régulier et mesurable.", icon: "repeat-outline" },
      { id: "5-7", label: "5 à 7 par semaine", detail: "Phase de croissance active.", icon: "flash-outline" },
      { id: "multiple", label: "Plusieurs par jour", detail: "Production déjà industrialisée.", icon: "layers-outline" }
    ]
  },
  {
    id: "format",
    eyebrow: "FORMAT NATUREL",
    title: "Qu'est-ce que tu crées le plus facilement ?",
    subtitle: "Le meilleur système part de tes forces réelles.",
    options: [
      { id: "camera", label: "Face caméra", detail: "Conseils, réactions et histoires.", icon: "person-outline" },
      { id: "voice", label: "Voix off", detail: "Démonstrations et contenu faceless.", icon: "mic-outline" },
      { id: "carousel", label: "Carrousels", detail: "Idées structurées et sauvegardables.", icon: "images-outline" },
      { id: "mixed", label: "Un mix", detail: "Plusieurs formats selon le sujet.", icon: "shuffle-outline" }
    ]
  },
  {
    id: "time",
    eyebrow: "CAPACITÉ",
    title: "Combien de temps par semaine ?",
    subtitle: "VIRALY AI ajustera le volume de production.",
    options: [
      { id: "1-2h", label: "1 à 2 heures", detail: "Un système très concentré.", icon: "timer-outline" },
      { id: "3-5h", label: "3 à 5 heures", detail: "Un batch hebdomadaire complet.", icon: "time-outline" },
      { id: "6-10h", label: "6 à 10 heures", detail: "Croissance soutenue.", icon: "speedometer-outline" },
      { id: "10h+", label: "Plus de 10 heures", detail: "Activité créateur prioritaire.", icon: "briefcase-outline" }
    ]
  },
  {
    id: "monetization",
    eyebrow: "REVENUS",
    title: "Quelle piste veux-tu explorer ?",
    subtitle: "Ce choix orientera les sujets et les appels à l'action.",
    options: [
      { id: "affiliate", label: "Affiliation", detail: "Recommander des outils ou produits cohérents.", icon: "link-outline" },
      { id: "service", label: "Service ou coaching", detail: "Transformer l'expertise en offre.", icon: "chatbubbles-outline" },
      { id: "product", label: "Produit digital", detail: "Vendre template, guide ou formation.", icon: "cube-outline" },
      { id: "shop", label: "TikTok Shop", detail: "Créer du contenu qui démontre et convertit.", icon: "storefront-outline" }
    ]
  }
];

type Props = {
  googleStatus: GoogleConnectionStatus;
  googleName?: string;
  onConnectGoogle: () => void;
  onDeveloperPreview: () => void;
  previewAvailable: boolean;
  onComplete: (profile: CreatorOnboardingProfile) => void;
};

export function OnboardingScreen({
  googleStatus,
  googleName,
  onConnectGoogle,
  onDeveloperPreview,
  previewAvailable,
  onComplete
}: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<CreatorOnboardingProfile>>({});
  const [report, setReport] = useState<OnboardingAIReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const googleConnected = googleStatus === "connected";
  const showingReport = step >= questions.length && report !== null;
  const current = questions[Math.min(step, questions.length - 1)];
  const selected = answers[current?.id];

  const continueOnboarding = async () => {
    if (!selected || isAnalyzing) return;
    if (step < questions.length - 1) {
      setStep((value) => value + 1);
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const nextReport = await analyzeOnboarding(answers as CreatorOnboardingProfile);
      setReport(nextReport);
      setStep(questions.length);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de générer ton bilan.";
      setAnalysisError(message);
      Alert.alert(
        "Bilan indisponible",
        message
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!googleConnected) {
    return (
      <ScrollView contentContainerStyle={styles.authContent} showsVerticalScrollIndicator={false}>
        <View style={styles.authHero}>
          <Text style={styles.brand}>VIRALY <Text style={styles.brandAccent}>AI</Text></Text>
          <Text style={styles.authTitle}>Construisons ton point de départ.</Text>
          <Text style={styles.authBody}>Connecte ton compte Google pour conserver ton diagnostic, ou ouvre la version de test immédiatement.</Text>
        </View>
        <GlassPanel style={styles.authPanel}>
          <View style={styles.authMark}>
            <Ionicons color={palette.white} name="logo-google" size={28} />
          </View>
          <Text style={styles.authPanelTitle}>Ton espace créateur</Text>
          <Text style={styles.authPanelBody}>La connexion TikTok viendra ensuite. Google sert uniquement à sécuriser ton espace VIRALY AI.</Text>
          <TouchableOpacity disabled={googleStatus === "connecting"} onPress={onConnectGoogle} style={styles.googleButton}>
            <Ionicons color={palette.ink} name="logo-google" size={20} />
            <Text style={styles.googleButtonText}>{googleStatus === "connecting" ? "Connexion..." : "Continuer avec Google"}</Text>
          </TouchableOpacity>
          {previewAvailable ? (
            <TouchableOpacity disabled={googleStatus === "connecting"} onPress={onDeveloperPreview} style={styles.previewButton}>
              <Text style={styles.previewText}>{googleStatus === "connecting" ? "Ouverture..." : "Accéder à la version de test"}</Text>
            </TouchableOpacity>
          ) : null}
        </GlassPanel>
        <Text style={styles.privacy}>Tes réponses servent uniquement à personnaliser ton plan.</Text>
      </ScrollView>
    );
  }

  if (showingReport && report) {
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>PREMIER BILAN</Text>
          <Text style={styles.title}>Ton système peut commencer.</Text>
          <Text style={styles.subtitle}>{googleName ? `${googleName}, voici` : "Voici"} le point de départ calculé à partir de tes réponses.</Text>
        </View>
        <GlassPanel style={styles.reportPanel}>
          <View style={styles.reportTop}>
            <View>
              <Text style={styles.reportLabel}>Maturité créateur</Text>
              <Text style={styles.reportScore}>{report.score}<Text style={styles.reportMax}> /100</Text></Text>
            </View>
            <View style={styles.reportBadge}><Text style={styles.reportBadgeText}>{report.score >= 70 ? "PRÊT À ACCÉLÉRER" : "BASE À STRUCTURER"}</Text></View>
          </View>
          <ProgressBar color={palette.mint} value={report.score} />
          <Text style={styles.reportSummary}>{report.summary}</Text>
        </GlassPanel>
        <Text style={styles.sectionLabel}>TES 3 PRIORITÉS</Text>
        <GlassPanel style={styles.priorityPanel} textureOpacity={0.08}>
          {report.priorities.map((priority, index) => (
            <View key={priority} style={styles.priorityLine}>
              <Text style={styles.priorityIndex}>0{index + 1}</Text>
              <Text style={styles.priorityText}>{priority}</Text>
            </View>
          ))}
        </GlassPanel>
        <GlassPanel style={styles.cyclePanel}>
          <Text style={styles.cycleLabel}>PREMIER CYCLE RECOMMANDÉ</Text>
          <Text style={styles.cycleValue}>{report.cycle}</Text>
          <Text style={styles.cycleBody}>{report.firstWeek.join(" · ")}</Text>
          <View style={styles.revenueLine}>
            <Ionicons color={palette.mint} name="cash-outline" size={18} />
            <Text style={styles.revenueText}>{report.revenueDirection}</Text>
          </View>
        </GlassPanel>
        <TouchableOpacity onPress={() => onComplete(answers as CreatorOnboardingProfile)} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Entrer dans VIRALY AI</Text>
          <Ionicons color={palette.ink} name="arrow-forward" size={20} />
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.progressTop}>
        <Text style={styles.progressText}>{step + 1} / {questions.length}</Text>
        <Text style={styles.accountName}>{googleName || "Espace Google connecté"}</Text>
      </View>
      <ProgressBar color={palette.mint} value={((step + 1) / questions.length) * 100} />
      <View style={styles.header}>
        <Text style={styles.kicker}>{current.eyebrow}</Text>
        <Text style={styles.title}>{current.title}</Text>
        <Text style={styles.subtitle}>{current.subtitle}</Text>
      </View>
      <View style={styles.options}>
        {current.options.map((option) => {
          const active = selected === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              onPress={() => setAnswers((value) => ({ ...value, [current.id]: option.id }))}
              style={[styles.option, active && styles.optionActive]}
            >
              <View style={[styles.optionIcon, active && styles.optionIconActive]}>
                <Ionicons color={active ? palette.ink : palette.paperMuted} name={option.icon} size={21} />
              </View>
              <View style={styles.optionCopy}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionDetail}>{option.detail}</Text>
              </View>
              <Ionicons color={active ? palette.mint : palette.muted} name={active ? "checkmark-circle" : "ellipse-outline"} size={22} />
            </TouchableOpacity>
          );
        })}
      </View>
      {analysisError ? (
        <View style={styles.analysisError}>
          <Ionicons color={palette.paperMuted} name="alert-circle-outline" size={18} />
          <Text style={styles.analysisErrorText}>{analysisError}</Text>
        </View>
      ) : null}
      <View style={styles.navigation}>
        {step > 0 ? (
          <TouchableOpacity onPress={() => setStep((value) => value - 1)} style={styles.backButton}>
            <Ionicons color={palette.white} name="arrow-back" size={20} />
          </TouchableOpacity>
        ) : <View style={styles.backPlaceholder} />}
        <TouchableOpacity disabled={!selected || isAnalyzing} onPress={continueOnboarding} style={[styles.continueButton, (!selected || isAnalyzing) && styles.continueDisabled]}>
          <Text style={styles.continueText}>{isAnalyzing ? "Analyse en cours..." : step === questions.length - 1 ? "Générer mon bilan" : "Continuer"}</Text>
          <Ionicons color={palette.ink} name="arrow-forward" size={20} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  authContent: { flexGrow: 1, justifyContent: "space-between", padding: spacing.lg, paddingBottom: spacing.xxl, paddingTop: 70 },
  authHero: { gap: spacing.md },
  brand: { color: palette.white, fontSize: 20, fontWeight: "900" },
  brandAccent: { color: palette.mint },
  authTitle: { color: palette.white, fontSize: 38, fontWeight: "900", lineHeight: 41, maxWidth: 340 },
  authBody: { ...typography.body, color: palette.paperMuted, maxWidth: 360 },
  authPanel: { alignItems: "center", gap: spacing.md, padding: spacing.xl },
  authMark: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)", borderColor: palette.line, borderRadius: 28, borderWidth: 1, height: 56, justifyContent: "center", width: 56 },
  authPanelTitle: { ...typography.h2, color: palette.white },
  authPanelBody: { ...typography.body, color: palette.paperMuted, textAlign: "center" },
  googleButton: { alignItems: "center", backgroundColor: palette.paper, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 54, width: "100%" },
  googleButtonText: { ...typography.body, color: palette.ink, fontWeight: "900" },
  previewButton: { padding: spacing.sm },
  previewText: { ...typography.caption, color: palette.muted },
  privacy: { ...typography.caption, color: palette.muted, textAlign: "center" },
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl, paddingTop: spacing.xl },
  progressTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  progressText: { ...typography.caption, color: palette.mint },
  accountName: { ...typography.caption, color: palette.muted },
  header: { gap: spacing.sm },
  kicker: { ...typography.caption, color: palette.mint },
  title: { ...typography.title, color: palette.white },
  subtitle: { ...typography.body, color: palette.paperMuted },
  options: { gap: spacing.sm },
  option: { alignItems: "center", backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 82, padding: spacing.md },
  optionActive: { backgroundColor: "rgba(69,242,164,0.10)", borderColor: palette.mint },
  optionIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: radius.sm, height: 42, justifyContent: "center", width: 42 },
  optionIconActive: { backgroundColor: palette.mint },
  optionCopy: { flex: 1, gap: 3 },
  optionLabel: { ...typography.h3, color: palette.white },
  optionDetail: { ...typography.caption, color: palette.muted },
  analysisError: { alignItems: "flex-start", borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  analysisErrorText: { ...typography.caption, color: palette.paperMuted, flex: 1 },
  navigation: { flexDirection: "row", gap: spacing.sm },
  backButton: { alignItems: "center", borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, height: 54, justifyContent: "center", width: 54 },
  backPlaceholder: { width: 54 },
  continueButton: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.md, flex: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 54 },
  continueDisabled: { opacity: 0.28 },
  continueText: { ...typography.body, color: palette.ink, fontWeight: "900" },
  reportPanel: { gap: spacing.md, padding: spacing.lg },
  reportTop: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  reportLabel: { ...typography.caption, color: palette.muted },
  reportScore: { color: palette.white, fontSize: 44, fontWeight: "900", lineHeight: 49 },
  reportMax: { ...typography.h3, color: palette.muted },
  reportBadge: { backgroundColor: "rgba(69,242,164,0.11)", borderColor: palette.mint, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  reportBadgeText: { color: palette.mint, fontSize: 9, fontWeight: "900" },
  reportSummary: { ...typography.body, color: palette.paperMuted },
  sectionLabel: { ...typography.caption, color: palette.mint },
  priorityPanel: { gap: 0, paddingHorizontal: spacing.lg },
  priorityLine: { alignItems: "center", borderBottomColor: palette.line, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 68 },
  priorityIndex: { ...typography.caption, color: palette.mint },
  priorityText: { ...typography.body, color: palette.white, flex: 1 },
  cyclePanel: { gap: spacing.sm, padding: spacing.lg },
  cycleLabel: { ...typography.caption, color: palette.mint },
  cycleValue: { ...typography.h2, color: palette.white },
  cycleBody: { ...typography.body, color: palette.paperMuted },
  revenueLine: { alignItems: "flex-start", borderTopColor: palette.line, borderTopWidth: 1, flexDirection: "row", gap: spacing.sm, paddingTop: spacing.md },
  revenueText: { ...typography.body, color: palette.paperMuted, flex: 1 },
  primaryButton: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 56 },
  primaryButtonText: { ...typography.body, color: palette.ink, fontWeight: "900" }
});
