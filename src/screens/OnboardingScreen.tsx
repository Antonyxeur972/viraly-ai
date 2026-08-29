import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import { GlassPanel } from "../components/GlassPanel";
import { NeonButton } from "../components/NeonButton";
import { PaywallScreen } from "./PaywallScreen";
import { ProgressBar } from "../components/ProgressBar";
import { ScreenHero } from "../components/ScreenHero";
import { ViralyLoader } from "../components/ViralyLoader";
import { analyzeOnboarding, OnboardingAIReport } from "../services/ai";
import { estimateProfileRevenue } from "../lib/revenueModel";
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft
} from "../services/onboardingState";
import { scheduleStarterPublishingReminders } from "../services/postNotifications";
import { ProfileAnalysisReport, requestProfileAnalysis } from "../services/profileAnalysis";
import { internalTestingEnabled, markPaywallDismissed, SubscriptionPlan } from "../services/subscription";
import { palette, radius, spacing, typography } from "../theme";
import {
  CreatorOnboardingProfile,
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
    id: "platform",
    eyebrow: "PLATEFORME",
    title: "Où veux-tu accélérer ?",
    subtitle: "Tous les imports, analyses et plans suivront ce choix.",
    options: [
      { id: "tiktok", label: "TikTok", detail: "Vidéos courtes, carrousels et découverte.", icon: "logo-tiktok" },
      { id: "instagram", label: "Instagram", detail: "Reels, carrousels et conversion du profil.", icon: "logo-instagram" }
    ]
  },
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
    id: "nicheTopic",
    eyebrow: "NICHE",
    title: "Sur quel univers veux-tu créer ?",
    subtitle: "Choisis une base ou écris ta niche exacte.",
    options: [
      { id: "IA / tech / outils", label: "IA / Tech", detail: "Outils, productivité, automatisation.", icon: "hardware-chip-outline" },
      { id: "Business / argent", label: "Business", detail: "Revenus, vente, indépendance.", icon: "briefcase-outline" },
      { id: "Fitness / bien-être", label: "Fitness", detail: "Corps, énergie, discipline.", icon: "barbell-outline" },
      { id: "Beauté / skincare", label: "Beauté", detail: "Routine, transformation, produits.", icon: "sparkles-outline" },
      { id: "Food / recettes", label: "Food", detail: "Recettes, tests, astuces cuisine.", icon: "restaurant-outline" },
      { id: "Développement personnel", label: "Mindset", detail: "Habitudes, confiance, clarté.", icon: "sunny-outline" }
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
      { id: "partnerships", label: "Partenariats de marque", detail: "Créer des contenus sponsorisés cohérents avec l'audience.", icon: "ribbon-outline" }
    ]
  }
];

type Props = {
  onComplete: (profile: CreatorOnboardingProfile, accountContext: ProfileAnalysisReport | null) => void;
  onEnsureSession: () => Promise<void>;
};

type Phase = "questions" | "profile" | "notifications" | "analyzing" | "report" | "paywall";

const defaultProfile: CreatorOnboardingProfile = {
  platform: "tiktok",
  goal: "reach",
  niche: "none",
  nicheTopic: "Création de contenu",
  followers: "0-100",
  cadence: "3-4",
  format: "mixed",
  time: "3-5h",
  monetization: "affiliate"
};

export function OnboardingScreen({
  onComplete,
  onEnsureSession
}: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<CreatorOnboardingProfile>>({});
  const [customNiche, setCustomNiche] = useState("");
  const [report, setReport] = useState<OnboardingAIReport | null>(null);
  const [phase, setPhase] = useState<Phase>("questions");
  const [profileReport, setProfileReport] = useState<ProfileAnalysisReport | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [profileAnalyzing, setProfileAnalyzing] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const current = questions[Math.min(step, questions.length - 1)];
  const selected = current?.id === "nicheTopic" && customNiche.trim()
    ? customNiche.trim()
    : answers[current?.id];

  const completedProfile = useMemo(
    () => ({ ...defaultProfile, ...answers, nicheTopic: customNiche.trim() || answers.nicheTopic || defaultProfile.nicheTopic }),
    [answers, customNiche]
  ) as CreatorOnboardingProfile;
  const revenue = useMemo(
    () => estimateProfileRevenue(completedProfile, profileReport?.metrics.followers),
    [completedProfile, profileReport]
  );

  useEffect(() => {
    loadOnboardingDraft()
      .then((draft) => {
        if (!draft) return;
        setStep(Math.min(draft.step, questions.length - 1));
        setAnswers(draft.answers);
        setCustomNiche(draft.customNiche);
        if (draft.phase) setPhase(draft.phase);
      })
      .finally(() => setDraftReady(true));
  }, []);

  useEffect(() => {
    if (!draftReady || !["questions", "profile", "notifications"].includes(phase)) return;
    saveOnboardingDraft({ answers, customNiche, phase: phase as "questions" | "profile" | "notifications", step }).catch(() => {});
  }, [answers, customNiche, draftReady, phase, step]);

  const continueOnboarding = async () => {
    if (!selected) return;
    const nextAnswers = current?.id === "nicheTopic" && customNiche.trim()
      ? { ...answers, nicheTopic: customNiche.trim() }
      : answers;
    if (step < questions.length - 1) {
      setAnswers(nextAnswers);
      setStep((value) => value + 1);
      return;
    }

    setAnswers(nextAnswers);
    setPhase("profile");
  };

  const skipCurrent = () => {
    const nextAnswers = { ...answers, [current.id]: defaultProfile[current.id] };
    setAnswers(nextAnswers);
    if (step < questions.length - 1) setStep((value) => value + 1);
    else setPhase("profile");
  };

  const skipQuestionnaire = () => {
    setAnswers(defaultProfile);
    setCustomNiche(defaultProfile.nicheTopic || "");
    setPhase("profile");
  };

  const chooseProfileCapture = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Accès aux photos", "Autorise VIRALY AI à lire uniquement la capture que tu sélectionnes.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setProfileImage(asset.uri);
    setProfileAnalyzing(true);
    setAnalysisError(null);
    try {
      await onEnsureSession();
      setProfileReport(await requestProfileAnalysis(asset, completedProfile.platform));
    } catch (error) {
      const message = error instanceof Error ? error.message : "La capture n'a pas pu être analysée.";
      setAnalysisError(message);
      Alert.alert("Analyse du profil", message);
    } finally {
      setProfileAnalyzing(false);
    }
  };

  const generateReport = async () => {
    setPhase("analyzing");
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      await onEnsureSession();
      setReport(await analyzeOnboarding(completedProfile));
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "Le bilan IA est momentanément indisponible.");
      setReport({
        score: 58,
        summary: `Une base exploitable en ${completedProfile.nicheTopic}, à rendre plus précise et régulière.`,
        priorities: [
          "Formule une promesse unique pour une audience et un résultat précis.",
          "Publie trois contenus avec le même angle avant de changer de direction.",
          "Mesure les vues, sauvegardes et visites du profil après chaque publication."
        ],
        strengths: [
          `Tu as choisi ${completedProfile.format === "mixed" ? "plusieurs formats complémentaires" : "un format naturel clair"}.`,
          `Ta cadence de ${completedProfile.cadence} contenus par semaine est mesurable.`,
          `La piste ${completedProfile.monetization} donne une direction de revenu à tester.`
        ],
        cycle: "Un test de 7 jours, un angle, trois publications",
        firstWeek: ["Clarifier la promesse", "Publier trois variantes", "Comparer les signaux"],
        revenueDirection: "Valide d'abord une demande réelle avant de développer une offre.",
        analysisId: "local_onboarding"
      });
    } finally {
      setIsAnalyzing(false);
      setPhase("report");
    }
  };

  const enableNotifications = async () => {
    try {
      const result = await scheduleStarterPublishingReminders();
      if (!result.permissionGranted && !result.unsupported) {
        Alert.alert("Notifications non activées", "Tu pourras les activer plus tard depuis les réglages du téléphone.");
      }
    } catch {
      Alert.alert("Rappels indisponibles", "Tu pourras les activer plus tard depuis ton plan.");
    }
    await generateReport();
  };

  const finishAccess = async (dismissed: boolean) => {
    if (dismissed) await markPaywallDismissed();
    await clearOnboardingDraft();
    onComplete(completedProfile, profileReport);
  };

  const purchase = async (_plan: SubscriptionPlan) => {
    Alert.alert(
      "Paiement Google Play",
      internalTestingEnabled
        ? "Dans Expo Go, utilise le code testeur pour débloquer gratuitement VIRALY Pro. Le paiement réel s'ouvrira dans la version Google Play."
        : "Le produit doit être activé dans Google Play Console avant l'ouverture des achats."
    );
    return false;
  };

  if (phase === "paywall") {
    return (
      <PaywallScreen
        onClose={() => finishAccess(true)}
        onPurchase={purchase}
        onUnlocked={() => finishAccess(false)}
      />
    );
  }

  if (phase === "analyzing") {
    return (
      <View style={styles.loaderScreen}>
        <ViralyLoader />
        <Text style={styles.loaderTitle}>VIRALY construit ton point de départ</Text>
        <Text style={styles.loaderBody}>Lecture de ta niche, de ton rythme et des signaux visibles du profil.</Text>
      </View>
    );
  }

  if (phase === "profile") {
    const platformLabel = completedProfile.platform === "instagram" ? "Instagram" : "TikTok";
    const platformIcon = completedProfile.platform === "instagram" ? "logo-instagram" : "logo-tiktok";
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.progressTop}>
          <Text style={styles.progressText}>PROFIL · FACULTATIF</Text>
          <TouchableOpacity onPress={() => setPhase("notifications")}><Text style={styles.skipText}>Passer</Text></TouchableOpacity>
        </View>
        <ScreenHero
          eyebrow="DONNÉES DU COMPTE"
          icon={platformIcon}
          subtitle="La connexion officielle arrivera après validation des API. Ta capture permet déjà une vraie lecture visuelle."
          title={<>Ajoute ton profil <Text style={styles.titleAccent}>{platformLabel}.</Text></>}
        />
        <TouchableOpacity
          onPress={() => Alert.alert(`Connexion ${platformLabel}`, "Prochainement disponible · nous attendons l'autorisation officielle de la plateforme.")}
          style={styles.socialButton}
        >
          <Ionicons color={palette.white} name={platformIcon} size={23} />
          <Text style={styles.socialButtonText}>Connecter {platformLabel}</Text>
          <Text style={styles.soonBadge}>BIENTÔT</Text>
        </TouchableOpacity>
        <TouchableOpacity disabled={profileAnalyzing} onPress={chooseProfileCapture} style={styles.captureButton}>
          <View style={styles.captureIcon}><Ionicons color={palette.white} name="image-outline" size={25} /></View>
          <View style={styles.captureCopy}>
            <Text style={styles.captureTitle}>{profileImage ? "Changer la capture" : "Choisir une capture du profil"}</Text>
            <Text style={styles.captureDetail}>Une image verticale et nette, sélectionnée par toi.</Text>
          </View>
          <Ionicons color={palette.paperMuted} name="chevron-forward" size={21} />
        </TouchableOpacity>
        {profileImage ? (
          <GlassPanel style={styles.captureResult} textureOpacity={0.04}>
            <Image source={{ uri: profileImage }} style={styles.capturePreview} />
            {profileAnalyzing ? (
              <View style={styles.captureStatus}><ViralyLoader compact /><Text style={styles.captureStatusText}>Analyse visuelle en cours...</Text></View>
            ) : profileReport ? (
              <View style={styles.captureStatus}>
                <Text style={styles.captureScore}>{profileReport.score}<Text style={styles.captureScoreMax}> /100</Text></Text>
                <Text style={styles.captureStatusText}>{profileReport.summary}</Text>
              </View>
            ) : null}
          </GlassPanel>
        ) : null}
        {analysisError ? <Text style={styles.inlineError}>{analysisError}</Text> : null}
        <NeonButton disabled={profileAnalyzing} onPress={() => setPhase("notifications")} title={profileReport ? "Continuer avec cette analyse" : "Continuer"} />
      </ScrollView>
    );
  }

  if (phase === "notifications") {
    return (
      <ScrollView contentContainerStyle={styles.notificationContent} showsVerticalScrollIndicator={false}>
        <ViralyLoader compact />
        <ScreenHero
          eyebrow="RYTHME DE PUBLICATION"
          icon="notifications-outline"
          subtitle="Deux rappels quotidiens à 12:00 et 18:30, heure de Paris. Tu peux les désactiver à tout moment dans les réglages."
          title={<>Publie au <Text style={styles.titleAccent}>bon moment.</Text></>}
        />
        <GlassPanel style={styles.notificationPanel} textureOpacity={0.06}>
          <View style={styles.timeLine}><Text style={styles.timeValue}>12:00</Text><Text style={styles.timeCopy}>Premier créneau à tester</Text></View>
          <View style={styles.timeLine}><Text style={styles.timeValue}>18:30</Text><Text style={styles.timeCopy}>Deuxième créneau à tester</Text></View>
        </GlassPanel>
        <Text style={styles.consentCopy}>Active les notifications pour optimiser ton utilisation, savoir quand poster et maintenir ta régularité. VIRALY demandera ensuite l'autorisation du téléphone.</Text>
        <NeonButton icon="notifications" onPress={enableNotifications} title="Activer les notifications" />
        <TouchableOpacity onPress={generateReport}><Text style={styles.discoveryLink}>Pas maintenant</Text></TouchableOpacity>
      </ScrollView>
    );
  }

  if (phase === "report" && report) {
    return (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHero
          eyebrow="Premier bilan"
          icon="analytics-outline"
          subtitle="Ce diagnostic combine tes réponses et, si tu l'as ajoutée, la lecture réelle de ta capture."
          title={<>Ton point de départ est <Text style={styles.titleAccent}>clair.</Text></>}
        />
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
        <Text style={styles.sectionLabel}>3 CONSEILS · 3 LIGNES</Text>
        <GlassPanel style={styles.priorityPanel} textureOpacity={0.08}>
          {[...(profileReport?.priorities || []), ...report.priorities].filter((item, index, values) => values.indexOf(item) === index).slice(0, 3).map((priority, index) => (
            <View key={priority} style={styles.priorityLine}>
              <Text style={styles.priorityIndex}>0{index + 1}</Text>
              <Text style={styles.priorityText}>{priority}</Text>
            </View>
          ))}
        </GlassPanel>
        <Text style={styles.sectionLabel}>TES 3 POINTS FORTS</Text>
        <GlassPanel style={styles.strengthPanel} textureOpacity={0.05}>
          {(report.strengths || [
            "Tu as choisi un format de contenu exploitable.",
            "Ta cadence donne une base de progression mesurable.",
            "Ta piste de monétisation fournit une direction claire."
          ]).slice(0, 3).map((strength) => (
            <View key={strength} style={styles.strengthLine}>
              <Ionicons color={palette.positive} name="checkmark-circle" size={19} />
              <Text style={styles.strengthText}>{strength}</Text>
            </View>
          ))}
        </GlassPanel>
        <GlassPanel style={styles.cyclePanel}>
          <Text style={styles.cycleLabel}>REVENU POTENTIEL APRÈS OPTIMISATION</Text>
          <Text style={styles.revenueValue}>{revenue.monthlyLow.toLocaleString("fr-FR")} à {revenue.monthlyHigh.toLocaleString("fr-FR")} € / mois</Text>
          <Text style={styles.revenueBasis}>{revenue.channel} · {revenue.basis}</Text>
          <Text style={styles.revenueDisclaimer}>Projection indicative, jamais garantie. Le résultat dépend de l'offre, de l'audience et de la conversion réelle.</Text>
        </GlassPanel>
        <NeonButton onPress={() => setPhase("paywall")} title="Continuer" />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.progressTop}>
        <Text style={styles.progressText}>{step + 1} / {questions.length}</Text>
        <TouchableOpacity onPress={skipCurrent}><Text style={styles.skipText}>Passer</Text></TouchableOpacity>
      </View>
      <ProgressBar color={palette.mint} value={((step + 1) / questions.length) * 100} />
      <ScreenHero eyebrow={current.eyebrow} icon="navigate-outline" subtitle={current.subtitle} title={current.title} />
      <View style={styles.options}>
        {current.options.map((option) => {
          const active = selected === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              onPress={() => {
                if (current.id === "nicheTopic") setCustomNiche("");
                setAnswers((value) => ({ ...value, [current.id]: option.id }));
              }}
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
      {current.id === "nicheTopic" ? (
        <View style={styles.customNichePanel}>
          <Text style={styles.customNicheLabel}>Écrire ma niche</Text>
          <TextInput
            onChangeText={(value) => {
              setCustomNiche(value);
              if (value.trim()) setAnswers((currentAnswers) => ({ ...currentAnswers, nicheTopic: value }));
            }}
            placeholder="Ex : IA pour agents immobiliers, coiffure afro, recettes antillaises..."
            placeholderTextColor={palette.muted}
            style={styles.customNicheInput}
            value={customNiche}
          />
        </View>
      ) : null}
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
        <View style={styles.continueGrow}>
          <NeonButton
            disabled={!selected}
            onPress={continueOnboarding}
            title={step === questions.length - 1 ? "Continuer vers mon profil" : "Continuer"}
          />
        </View>
      </View>
      {step === 0 ? (
        <TouchableOpacity onPress={skipQuestionnaire}><Text style={styles.discoveryLink}>Passer tout le questionnaire</Text></TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  authContent: { flexGrow: 1, justifyContent: "space-between", padding: spacing.lg, paddingBottom: spacing.xxl, paddingTop: 72 },
  authHero: { gap: spacing.md },
  brand: { color: palette.white, fontSize: 25, fontWeight: "800" },
  brandAccent: { color: palette.mint },
  titleAccent: { color: palette.electric },
  authTitle: { color: palette.white, fontSize: 39, fontWeight: "800", lineHeight: 43, maxWidth: 360 },
  authBody: { ...typography.body, color: palette.paperMuted, maxWidth: 360 },
  authPanel: { alignItems: "center", borderColor: palette.lineStrong, gap: spacing.md, padding: spacing.xl },
  authMark: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.pill, height: 58, justifyContent: "center", width: 58 },
  authPanelTitle: { ...typography.h2, color: palette.white },
  authPanelBody: { ...typography.body, color: palette.paperMuted, textAlign: "center" },
  googleButton: { alignItems: "center", backgroundColor: palette.paper, borderRadius: radius.pill, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 54, width: "100%" },
  googleButtonText: { ...typography.body, color: palette.ink, fontWeight: "900" },
  previewButton: { borderColor: palette.line, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  previewText: { ...typography.caption, color: palette.paperMuted },
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
  option: { alignItems: "center", backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 88, padding: spacing.md },
  optionActive: { backgroundColor: "rgba(45,124,255,0.10)", borderColor: palette.lineStrong },
  optionIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: radius.pill, height: 44, justifyContent: "center", width: 44 },
  optionIconActive: { backgroundColor: palette.mint },
  optionCopy: { flex: 1, gap: 3 },
  optionLabel: { ...typography.h3, color: palette.white },
  optionDetail: { ...typography.caption, color: palette.muted },
  customNichePanel: { backgroundColor: palette.panel, borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  customNicheLabel: { ...typography.caption, color: palette.mint },
  customNicheInput: { ...typography.body, color: palette.white, minHeight: 48 },
  analysisError: { alignItems: "flex-start", borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.sm, padding: spacing.md },
  analysisErrorText: { ...typography.caption, color: palette.paperMuted, flex: 1 },
  navigation: { flexDirection: "row", gap: spacing.sm },
  backButton: { alignItems: "center", borderColor: palette.line, borderRadius: radius.pill, borderWidth: 1, height: 54, justifyContent: "center", width: 54 },
  backPlaceholder: { width: 54 },
  continueButton: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.pill, flex: 1, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 54 },
  continueDisabled: { opacity: 0.28 },
  continueText: { ...typography.body, color: palette.ink, fontWeight: "900" },
  continueGrow: { flex: 1 },
  reportPanel: { gap: spacing.md, padding: spacing.lg },
  reportTop: { alignItems: "flex-start", flexDirection: "row", gap: spacing.md, justifyContent: "space-between" },
  reportLabel: { ...typography.caption, color: palette.muted },
  reportScore: { color: palette.white, fontSize: 44, fontWeight: "900", lineHeight: 49 },
  reportMax: { ...typography.h3, color: palette.muted },
  reportBadge: { backgroundColor: "rgba(45,124,255,0.12)", borderColor: palette.mint, borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
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
  primaryButton: { alignItems: "center", backgroundColor: palette.mint, borderRadius: radius.pill, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 56 },
  primaryButtonText: { ...typography.body, color: palette.ink, fontWeight: "900" },
  skipText: { ...typography.caption, color: palette.paperMuted, textDecorationLine: "underline" },
  discoveryLink: { ...typography.body, color: palette.paperMuted, textAlign: "center", textDecorationLine: "underline" },
  loaderScreen: { alignItems: "center", flex: 1, gap: spacing.lg, justifyContent: "center", padding: spacing.xl },
  loaderTitle: { ...typography.h2, color: palette.white, textAlign: "center" },
  loaderBody: { ...typography.body, color: palette.paperMuted, maxWidth: 340, textAlign: "center" },
  socialButton: { alignItems: "center", backgroundColor: "rgba(5,14,34,0.72)", borderColor: palette.lineStrong, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 62, paddingHorizontal: spacing.lg },
  socialButtonText: { ...typography.h3, color: palette.white, flex: 1 },
  soonBadge: { color: palette.cyan, fontSize: 9, fontWeight: "900" },
  captureButton: { alignItems: "center", backgroundColor: "rgba(13,78,196,0.16)", borderColor: palette.electric, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 88, padding: spacing.md },
  captureIcon: { alignItems: "center", backgroundColor: palette.electric, borderRadius: radius.pill, height: 48, justifyContent: "center", width: 48 },
  captureCopy: { flex: 1, gap: 4 },
  captureTitle: { ...typography.h3, color: palette.white },
  captureDetail: { ...typography.caption, color: palette.paperMuted },
  captureResult: { flexDirection: "row", gap: spacing.md, minHeight: 150, padding: spacing.md },
  capturePreview: { backgroundColor: palette.panelSoft, borderRadius: radius.sm, height: 140, width: 78 },
  captureStatus: { alignItems: "flex-start", flex: 1, gap: spacing.sm, justifyContent: "center" },
  captureStatusText: { ...typography.body, color: palette.paperMuted, flexShrink: 1 },
  captureScore: { color: palette.white, fontSize: 36, fontWeight: "900" },
  captureScoreMax: { ...typography.body, color: palette.muted },
  inlineError: { ...typography.caption, color: palette.coral },
  notificationContent: { alignItems: "center", flexGrow: 1, gap: spacing.xl, justifyContent: "center", padding: spacing.lg, paddingBottom: spacing.xxl, paddingTop: 64 },
  notificationPanel: { alignSelf: "stretch", gap: 0, paddingHorizontal: spacing.lg },
  timeLine: { alignItems: "center", borderBottomColor: palette.line, borderBottomWidth: 1, flexDirection: "row", gap: spacing.lg, minHeight: 64 },
  timeValue: { color: palette.cyan, fontSize: 22, fontWeight: "900" },
  timeCopy: { ...typography.body, color: palette.white, flex: 1 },
  consentCopy: { ...typography.body, color: palette.paperMuted, maxWidth: 380, textAlign: "center" },
  strengthPanel: { gap: spacing.md, padding: spacing.lg },
  strengthLine: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm },
  strengthText: { ...typography.body, color: palette.white, flex: 1 },
  revenueValue: { color: palette.white, fontSize: 25, fontWeight: "900", lineHeight: 31 },
  revenueBasis: { ...typography.caption, color: palette.cyan },
  revenueDisclaimer: { color: palette.muted, fontSize: 11, lineHeight: 17 }
});
