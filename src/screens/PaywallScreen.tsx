import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import { GlassPanel } from "../components/GlassPanel";
import { ViralyLoader } from "../components/ViralyLoader";
import {
  activateTesterAccess,
  internalTestingEnabled,
  SubscriptionPlan
} from "../services/subscription";
import { palette, radius, spacing, typography } from "../theme";

type Props = {
  mode?: "standard" | "winback";
  expiresAt?: number | null;
  onClose: () => void;
  onPurchase: (plan: SubscriptionPlan) => Promise<boolean>;
  onUnlocked: () => void;
};

const PRIVACY_URL = "https://github.com/Antonyxeur972/viraly-ai/blob/main/docs/privacy-policy.md";
const TERMS_URL = "https://github.com/Antonyxeur972/viraly-ai/blob/main/docs/terms-of-use.md";

function formatCountdown(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function PaywallScreen({ mode = "standard", expiresAt, onClose, onPurchase, onUnlocked }: Props) {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>(mode === "winback" ? "annualWinback" : "annual");
  const [promoOpen, setPromoOpen] = useState(false);
  const [promo, setPromo] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (mode !== "winback" || !expiresAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [expiresAt, mode]);

  const remaining = Math.max(0, (expiresAt || 0) - now);
  const winbackActive = mode === "winback" && remaining > 0;
  const plans = useMemo(() => {
    if (winbackActive) {
      return [{
        id: "annualWinback" as const,
        label: "Offre annuelle de retour",
        price: "29,00 €",
        detail: "Première année, puis 59,00 €/an",
        badge: `Encore ${formatCountdown(remaining)}`
      }];
    }
    return [
      { id: "annual" as const, label: "Annuel", price: "59,00 €", detail: "Débité une fois par an · 4,92 €/mois", badge: "ÉCONOMISE 62 %" },
      { id: "monthly" as const, label: "Mensuel", price: "12,99 €", detail: "Débité chaque mois", badge: null }
    ];
  }, [remaining, winbackActive]);

  useEffect(() => {
    if (!winbackActive && selectedPlan === "annualWinback") setSelectedPlan("annual");
  }, [selectedPlan, winbackActive]);

  const purchase = async () => {
    if (isWorking) return;
    setIsWorking(true);
    try {
      const unlocked = await onPurchase(selectedPlan);
      if (unlocked) onUnlocked();
    } finally {
      setIsWorking(false);
    }
  };

  const applyPromo = async () => {
    const unlocked = await activateTesterAccess(promo);
    if (!unlocked) {
      Alert.alert("Code non reconnu", "Vérifie le code test puis réessaie.");
      return;
    }
    onUnlocked();
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <TouchableOpacity accessibilityLabel="Fermer l'offre" onPress={onClose} style={styles.closeButton}>
        <Ionicons color={palette.paperMuted} name="close" size={24} />
      </TouchableOpacity>

      <View style={styles.hero}>
        <ViralyLoader compact />
        <Text style={styles.eyebrow}>{winbackActive ? "OFFRE PERSONNELLE" : "VIRALY PRO"}</Text>
        <Text style={styles.title}>{winbackActive ? "Reprends ton avance." : "Passe de l'idée à l'exécution."}</Text>
        <Text style={styles.subtitle}>Plans personnalisés, analyses IA, historique et rappels de publication réunis au même endroit.</Text>
      </View>

      <View style={styles.benefits}>
        {["Un plan de contenu lié à ta niche", "Des analyses et conseils sauvegardés", "Un coach IA orienté actions"].map((item) => (
          <View key={item} style={styles.benefitLine}>
            <View style={styles.check}><Ionicons color={palette.white} name="checkmark" size={14} /></View>
            <Text style={styles.benefitText}>{item}</Text>
          </View>
        ))}
      </View>

      <View style={styles.plans}>
        {plans.map((plan) => {
          const active = selectedPlan === plan.id;
          return (
            <TouchableOpacity key={plan.id} onPress={() => setSelectedPlan(plan.id)} style={[styles.plan, active && styles.planActive]}>
              <View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioDot} /> : null}</View>
              <View style={styles.planCopy}>
                <View style={styles.planTitleLine}>
                  <Text style={styles.planLabel}>{plan.label}</Text>
                  {plan.badge ? <Text style={styles.planBadge}>{plan.badge}</Text> : null}
                </View>
                <Text style={styles.planDetail}>{plan.detail}</Text>
              </View>
              <Text style={styles.planPrice}>{plan.price}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity disabled={isWorking} onPress={purchase} style={styles.subscribeButton}>
        <LinearGradient colors={["#0B63F3", "#179BFF", "#5358F2"]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.subscribeGradient}>
          <Text style={styles.subscribeText}>{isWorking ? "Ouverture de Google Play..." : "Continuer avec VIRALY Pro"}</Text>
          <Ionicons color={palette.white} name="arrow-forward" size={20} />
        </LinearGradient>
      </TouchableOpacity>

      <Text style={styles.renewal}>
        Renouvellement automatique. Annulation à tout moment dans Google Play avant la prochaine échéance. L'abonnement n'est pas obligatoire pour continuer en mode découverte.
      </Text>

      {internalTestingEnabled ? (
        <GlassPanel style={styles.promoPanel} textureOpacity={0.05}>
          <TouchableOpacity onPress={() => setPromoOpen((value) => !value)} style={styles.promoHeader}>
            <Ionicons color={palette.electric} name="key-outline" size={18} />
            <Text style={styles.promoTitle}>Accès testeur</Text>
            <Ionicons color={palette.muted} name={promoOpen ? "chevron-up" : "chevron-down"} size={18} />
          </TouchableOpacity>
          {promoOpen ? (
            <View style={styles.promoForm}>
              <TextInput autoCapitalize="none" onChangeText={setPromo} placeholder="Code test" placeholderTextColor={palette.muted} style={styles.promoInput} value={promo} />
              <TouchableOpacity onPress={applyPromo} style={styles.promoButton}><Text style={styles.promoButtonText}>Valider</Text></TouchableOpacity>
            </View>
          ) : null}
        </GlassPanel>
      ) : null}

      <TouchableOpacity onPress={onClose}><Text style={styles.discovery}>Continuer en mode découverte</Text></TouchableOpacity>
      <View style={styles.legalLinks}>
        <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}><Text style={styles.legal}>Conditions</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}><Text style={styles.legal}>Confidentialité</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL("https://play.google.com/store/account/subscriptions")}><Text style={styles.legal}>Gérer l'abonnement</Text></TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, padding: spacing.lg, paddingBottom: 48, paddingTop: 54 },
  closeButton: { alignItems: "center", alignSelf: "flex-end", backgroundColor: "rgba(5,14,34,0.72)", borderRadius: radius.pill, height: 42, justifyContent: "center", width: 42 },
  hero: { alignItems: "center", gap: spacing.sm },
  eyebrow: { ...typography.caption, color: palette.electric },
  title: { ...typography.title, color: palette.white, textAlign: "center" },
  subtitle: { ...typography.body, color: palette.paperMuted, maxWidth: 390, textAlign: "center" },
  benefits: { gap: spacing.sm, paddingHorizontal: spacing.sm },
  benefitLine: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  check: { alignItems: "center", backgroundColor: palette.electric, borderRadius: radius.pill, height: 24, justifyContent: "center", width: 24 },
  benefitText: { ...typography.body, color: palette.white, flex: 1 },
  plans: { gap: spacing.sm },
  plan: { alignItems: "center", backgroundColor: "rgba(5,14,34,0.76)", borderColor: palette.line, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.md, minHeight: 84, padding: spacing.md },
  planActive: { backgroundColor: "rgba(25,109,255,0.13)", borderColor: palette.electric },
  radio: { alignItems: "center", borderColor: palette.muted, borderRadius: radius.pill, borderWidth: 1, height: 22, justifyContent: "center", width: 22 },
  radioActive: { borderColor: palette.cyan },
  radioDot: { backgroundColor: palette.cyan, borderRadius: radius.pill, height: 12, width: 12 },
  planCopy: { flex: 1, gap: 5 },
  planTitleLine: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  planLabel: { ...typography.h3, color: palette.white },
  planBadge: { color: palette.cyan, fontSize: 9, fontWeight: "900" },
  planDetail: { ...typography.caption, color: palette.paperMuted },
  planPrice: { color: palette.white, fontSize: 17, fontWeight: "900" },
  subscribeButton: { borderColor: "rgba(105,204,255,0.78)", borderRadius: radius.pill, borderWidth: 1, overflow: "hidden", shadowColor: palette.electric, shadowOpacity: 0.56, shadowRadius: 22 },
  subscribeGradient: { alignItems: "center", flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 58, paddingHorizontal: spacing.lg },
  subscribeText: { ...typography.body, color: palette.white, flexShrink: 1, fontWeight: "900", textAlign: "center" },
  renewal: { color: palette.muted, fontSize: 11, lineHeight: 17, textAlign: "center" },
  promoPanel: { padding: spacing.md },
  promoHeader: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  promoTitle: { ...typography.body, color: palette.paperMuted, flex: 1 },
  promoForm: { flexDirection: "row", gap: spacing.sm, paddingTop: spacing.md },
  promoInput: { ...typography.body, backgroundColor: "rgba(0,3,12,0.68)", borderRadius: radius.sm, color: palette.white, flex: 1, minHeight: 46, paddingHorizontal: spacing.md },
  promoButton: { alignItems: "center", backgroundColor: palette.electric, borderRadius: radius.sm, justifyContent: "center", paddingHorizontal: spacing.lg },
  promoButtonText: { ...typography.caption, color: palette.white },
  discovery: { ...typography.body, color: palette.paperMuted, textAlign: "center", textDecorationLine: "underline" },
  legalLinks: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg, justifyContent: "center" },
  legal: { color: palette.muted, fontSize: 11, textDecorationLine: "underline" }
});
