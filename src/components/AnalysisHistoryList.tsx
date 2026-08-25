import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { AnalysisHistoryItem } from "../services/analysisHistory";
import { palette, radius, spacing, typography } from "../theme";

type HistoryReport = {
  score: number;
  historyTitle?: string;
  summary?: string;
  thumbnail?: string | null;
};

type Props<T extends HistoryReport> = {
  activeId?: string;
  emptyLabel: string;
  items: AnalysisHistoryItem<T>[];
  onDelete: (item: AnalysisHistoryItem<T>) => void;
  onOpen: (item: AnalysisHistoryItem<T>) => void;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Analyse sauvegardée";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function AnalysisHistoryList<T extends HistoryReport>({
  activeId,
  emptyLabel,
  items,
  onDelete,
  onOpen
}: Props<T>) {
  if (!items.length) {
    return (
      <View style={styles.empty}>
        <Ionicons color={palette.muted} name="time-outline" size={20} />
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <View key={item.id} style={[styles.row, active && styles.rowActive]}>
            <TouchableOpacity onPress={() => onOpen(item)} style={styles.openButton}>
              {item.report.thumbnail ? (
                <Image source={{ uri: item.report.thumbnail }} style={styles.thumbnail} />
              ) : (
                <View style={styles.placeholder}>
                  <Ionicons color={palette.mint} name="analytics-outline" size={20} />
                </View>
              )}
              <View style={styles.copy}>
                <Text numberOfLines={1} style={styles.title}>
                  {item.report.historyTitle || "Analyse VIRALY AI"}
                </Text>
                <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
                {item.report.summary ? (
                  <Text numberOfLines={2} style={styles.summary}>{item.report.summary}</Text>
                ) : null}
                <View style={styles.openLabel}>
                  <Text style={styles.openLabelText}>Voir l'analyse</Text>
                  <Ionicons color={palette.mint} name="arrow-forward" size={13} />
                </View>
              </View>
              <View style={styles.scoreWrap}>
                <Text style={styles.score}>{item.report.score}</Text>
                <Text style={styles.scoreMax}>/100</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel="Supprimer cette analyse"
              onPress={() => onDelete(item)}
              style={styles.deleteButton}
            >
              <Ionicons color={palette.muted} name="trash-outline" size={17} />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: {
    alignItems: "center",
    backgroundColor: palette.panel,
    borderColor: palette.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 86,
    overflow: "hidden"
  },
  rowActive: { borderColor: palette.mint },
  openButton: { alignItems: "center", flex: 1, flexDirection: "row", gap: spacing.md, minWidth: 0, padding: spacing.sm },
  thumbnail: { borderRadius: radius.sm, height: 68, width: 50 },
  placeholder: { alignItems: "center", backgroundColor: palette.panelSoft, borderRadius: radius.sm, height: 68, justifyContent: "center", width: 50 },
  copy: { flex: 1, gap: 3, minWidth: 0 },
  title: { ...typography.caption, color: palette.white },
  date: { color: palette.muted, fontSize: 10, lineHeight: 14 },
  summary: { color: palette.paperMuted, fontSize: 11, lineHeight: 15 },
  openLabel: { alignItems: "center", flexDirection: "row", gap: 4, marginTop: 2 },
  openLabelText: { color: palette.mint, fontSize: 10, fontWeight: "800", lineHeight: 14 },
  scoreWrap: { alignItems: "baseline", flexDirection: "row" },
  score: { color: palette.mint, fontSize: 18, fontWeight: "900" },
  scoreMax: { color: palette.muted, fontSize: 9, fontWeight: "700" },
  deleteButton: { alignItems: "center", alignSelf: "stretch", borderLeftColor: palette.line, borderLeftWidth: 1, justifyContent: "center", width: 40 },
  empty: { alignItems: "center", borderColor: palette.line, borderRadius: radius.md, borderStyle: "dashed", borderWidth: 1, flexDirection: "row", gap: spacing.sm, minHeight: 64, paddingHorizontal: spacing.md },
  emptyText: { ...typography.caption, color: palette.muted, flex: 1 }
});
