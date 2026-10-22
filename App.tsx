import React, { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as game from "./src/game/spades";

type Game = ReturnType<typeof game.newRound>;
const C = {
  bg: "#0C1421",
  panel: "#152234",
  line: "#29384A",
  text: "#F4EDE0",
  muted: "#9CAABD",
  gold: "#DCAF79",
  teal: "#75C8B0",
};
const names = ["You", "Jules", "Maya", "Leo"];
const KEY = "88games.spades.v1";
const ranks: Record<number, string> = { 11: "J", 12: "Q", 13: "K", 14: "A" };
function Button({
  title,
  onPress,
  secondary = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        { opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: C.text }]}>
        {title}
      </Text>
    </Pressable>
  );
}
function Card({
  card,
  onPress,
  disabled = false,
  small = false,
}: {
  card: any;
  onPress?: () => void;
  disabled?: boolean;
  small?: boolean;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (live)
        Animated.timing(anim, {
          toValue: 1,
          duration: reduce ? 0 : 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
    });
    return () => {
      live = false;
      anim.stopAnimation();
    };
  }, []);
  const red = card.suit === "H" || card.suit === "D";
  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [16, 0],
            }),
          },
        ],
      }}
    >
      <Pressable
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={`${ranks[card.rank] || card.rank} of ${{ S: "spades", H: "hearts", D: "diamonds", C: "clubs" }[card.suit as "S"]}${disabled ? ", unavailable" : ""}`}
        disabled={disabled || !onPress}
        onPress={onPress}
        style={[
          s.card,
          small && s.smallCard,
          disabled && { opacity: 0.38 },
          onPress && !disabled && s.playable,
        ]}
      >
        <Text style={[s.cardRank, { color: red ? "#B33D4C" : "#172335" }]}>
          {ranks[card.rank] || card.rank}
        </Text>
        <Text
          style={[
            s.cardSuit,
            { color: red ? "#B33D4C" : "#172335" },
            small && { fontSize: 26 },
          ]}
        >
          {game.symbol[card.suit as "S"]}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <Main />
    </SafeAreaProvider>
  );
}
function Main() {
  const [screen, setScreen] = useState<"home" | "game">("home");
  const [state, setState] = useState<Game | null>(null),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [rules, setRules] = useState(false),
    [confirm, setConfirm] = useState(false),
    [selection, setSelection] = useState(3),
    [reduced, setReduced] = useState(false);
  const { width } = useWindowDimensions();
  const persist = useRef(Promise.resolve());
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) {
          const data = JSON.parse(raw);
          if (game.isSavedGame(data)) setState(data);
          else
            setError(
              "Your saved game could not be restored. Start a fresh match.",
            );
        }
      })
      .catch(() =>
        setError("Could not read your saved match. You can still play."),
      )
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    if (!loaded || !state) return;
    persist.current = persist.current
      .then(() => AsyncStorage.setItem(KEY, JSON.stringify(state)))
      .catch(() => {
        setError(
          "Saving is unavailable. Keep the app open to finish this match.",
        );
      });
  }, [state, loaded]);
  useEffect(() => {
    if (screen !== "game" || !state || rules || confirm) return;
    let next: (() => Game) | null = null;
    if (state.phase === "bidding" && state.turn !== 0)
      next = () => game.bid(state, game.botBid(state.hands[state.turn]));
    if (state.phase === "playing" && state.turn !== 0)
      next = () => game.play(state, game.botCard(state));
    if (state.phase === "trickEnd") next = () => game.collectTrick(state);
    if (next) {
      const timer = setTimeout(
        () => setState(next!()),
        reduced ? 100 : state.phase === "trickEnd" ? 1300 : 650,
      );
      return () => clearTimeout(timer);
    }
  }, [state, screen, rules, confirm, reduced]);
  const fresh = () => {
    setState(game.newRound());
    setScreen("game");
    setSelection(3);
    setConfirm(false);
  };
  const legal = state ? game.legalCards(state).map((c: any) => c.id) : [];
  const human = state?.turn === 0;
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="light" />
      <View
        style={[s.shell, width > 700 && { width: 700, alignSelf: "center" }]}
      >
        <View style={s.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Game library"
            onPress={() => setScreen("home")}
          >
            <Text style={s.logo}>
              88<Text style={{ color: C.gold }}> / </Text>GAMES
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setRules(true)}>
            <Text style={s.headerLink}>How to play</Text>
          </Pressable>
        </View>
        {!!error && (
          <Pressable
            onPress={() => setError("")}
            accessibilityLabel="Dismiss notification"
          >
            <Text style={s.error}>{error} ×</Text>
          </Pressable>
        )}
        {screen === "home" ? (
          <ScrollView contentContainerStyle={s.home}>
            <View style={s.eyebrowRow}>
              <View style={s.dot} />
              <Text style={s.eyebrow}>GOOD GAMES. ZERO SIGNAL.</Text>
            </View>
            <Text style={s.heroTitle}>A little play.{"\n"}A world away.</Text>
            <Text style={s.description}>
              Your pocket-sized escape. Classic games, always ready — wherever
              life takes you.
            </Text>
            <View style={s.feature}>
              <View style={s.featureTop}>
                <Text style={s.pill}>THE FIRST OF MANY</Text>
                <Text style={s.offline}>↯ OFFLINE</Text>
              </View>
              <Image
                source={require("./assets/spades-hero.png")}
                style={s.art}
                resizeMode="cover"
                accessibilityLabel="Original illustration of ivory Spades cards on a midnight background"
              />
              <View style={s.featureBody}>
                <View style={s.row}>
                  <Text style={s.gameTitle}>Spades</Text>
                  <Text style={s.star}>♠</Text>
                </View>
                <Text style={s.description}>
                  Find your partner. Read the table.{"\n"}Make every trick
                  count.
                </Text>
                <View style={s.tags}>
                  <Text style={s.tag}>1 PLAYER + 3 BOTS</Text>
                  <Text style={s.tag}>STRATEGY</Text>
                </View>
                <Button
                  title={
                    state && state.phase !== "matchEnd"
                      ? "Continue your match  →"
                      : "Take a seat  →"
                  }
                  disabled={!loaded}
                  onPress={() =>
                    state && state.phase !== "matchEnd"
                      ? setScreen("game")
                      : fresh()
                  }
                />
                {state && state.phase !== "matchEnd" && (
                  <Pressable
                    onPress={() => setConfirm(true)}
                    style={s.textButton}
                  >
                    <Text style={s.subtle}>Start a new match</Text>
                  </Pressable>
                )}
              </View>
            </View>
            <View style={[s.row, { marginTop: 28 }]}>
              <Text style={s.sectionTitle}>
                Small collection. Big possibilities.
              </Text>
              <Text style={s.subtle}>01 / 01</Text>
            </View>
            <Text style={[s.description, { marginTop: 10 }]}>
              One thoughtfully made classic to start. More games will join the
              collection over time.
            </Text>
            <View style={s.footer}>
              <Text style={s.footerText}>NO ACCOUNT</Text>
              <Text style={s.footerText}>NO CONNECTION</Text>
              <Text style={s.footerText}>JUST PLAY</Text>
            </View>
          </ScrollView>
        ) : (
          state && (
            <ScrollView contentContainerStyle={s.gameContent}>
              <View style={s.row}>
                <View>
                  <Text style={s.eyebrow}>SPADES / ROUND {state.round}</Text>
                  <Text style={s.tableTitle}>The midnight table</Text>
                </View>
                <Pressable
                  onPress={() => setConfirm(true)}
                  accessibilityRole="button"
                >
                  <Text style={s.headerLink}>New match</Text>
                </Pressable>
              </View>
              <View style={s.scoreboard}>
                {[0, 1].map((t) => (
                  <View key={t} style={s.scoreSide}>
                    <Text style={s.eyebrow}>
                      {t === 0 ? "YOU + MAYA" : "JULES + LEO"}
                    </Text>
                    <Text style={[s.score, t === 0 && { color: C.gold }]}>
                      {state.scores[t]}
                      <Text style={s.scoreTarget}> / 500</Text>
                    </Text>
                    <Text style={s.subtle}>
                      {state.bags[t]} bags ·{" "}
                      {state.tricks[t] + state.tricks[t + 2]} tricks
                    </Text>
                  </View>
                ))}
              </View>
              <View style={s.table}>
                <View style={s.tableOutline} />
                {[2, 1, 3].map((p) => (
                  <View
                    key={p}
                    style={[
                      s.player,
                      p === 2 ? s.north : p === 1 ? s.west : s.east,
                    ]}
                  >
                    <View
                      style={[s.avatar, state.turn === p && s.activeAvatar]}
                    >
                      <Text style={s.avatarText}>{names[p][0]}</Text>
                    </View>
                    <Text style={s.playerName}>
                      {names[p]}
                      {p === 2 ? " · partner" : ""}
                    </Text>
                    <Text style={s.playerDetail}>
                      {state.bids[p] === null
                        ? "Thinking…"
                        : `${state.tricks[p]} / ${state.bids[p] === 0 ? "nil" : state.bids[p]}`}
                    </Text>
                  </View>
                ))}
                <View style={s.centerCards}>
                  {state.trick.length ? (
                    state.trick.map((p: any) => (
                      <View key={p.seat} style={{ alignItems: "center" }}>
                        <Card card={p.card} small />
                        <Text style={s.playLabel}>{names[p.seat]}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={{ alignItems: "center" }}>
                      <Text style={s.tableSpade}>♠</Text>
                      <Text style={s.tableCaption}>88 GAMES CLUB</Text>
                    </View>
                  )}
                </View>
                <Text style={s.tableStatus}>
                  {state.broken ? "SPADES ARE BROKEN" : "SPADES NOT YET BROKEN"}
                </Text>
              </View>
              <View accessibilityLiveRegion="polite" style={s.statusBar}>
                <Text style={s.status}>
                  {state.phase === "bidding"
                    ? human
                      ? "Your bid. How many tricks?"
                      : `${names[state.turn]} is bidding…`
                    : state.phase === "trickEnd"
                      ? `${names[game.trickWinner(state.trick)]} takes the trick`
                      : state.phase === "roundEnd"
                        ? "Round complete"
                        : state.phase === "matchEnd"
                          ? state.winner === 0
                            ? "Your team wins!"
                            : "Jules and Leo win this match"
                          : human
                            ? "Your turn. Choose a highlighted card."
                            : `${names[state.turn]} is playing…`}
                </Text>
                <Text style={s.subtle}>{state.completed} / 13 tricks</Text>
              </View>
              {state.phase === "bidding" && human && (
                <View style={s.bidPanel}>
                  <Text style={s.description}>
                    Bid nil for +100 if you take no tricks. A failed nil costs
                    100.
                  </Text>
                  <View style={s.bidControls}>
                    <Button
                      title="−"
                      secondary
                      disabled={selection === 0}
                      onPress={() => setSelection((n) => n - 1)}
                    />
                    <Text accessibilityLiveRegion="polite" style={s.bidNumber}>
                      {selection === 0 ? "Nil" : selection}
                    </Text>
                    <Button
                      title="+"
                      secondary
                      disabled={selection === 13}
                      onPress={() => setSelection((n) => n + 1)}
                    />
                  </View>
                  <Button
                    title={`Bid ${selection === 0 ? "nil" : selection + " tricks"}`}
                    onPress={() => setState(game.bid(state, selection))}
                  />
                </View>
              )}
              {["roundEnd", "matchEnd"].includes(state.phase) && (
                <View style={s.bidPanel}>
                  <Text style={s.sectionTitle}>
                    {state.phase === "matchEnd"
                      ? "Thanks for playing."
                      : "The scores are in."}
                  </Text>
                  {state.history.at(-1)?.results.map((r: any, i: number) => (
                    <Text key={i} style={s.description}>
                      {i === 0 ? "Your team" : "Opponents"}: bid {r.contract},
                      took {r.taken} · {r.points > 0 ? "+" : ""}
                      {r.points} points
                    </Text>
                  ))}
                  <Button
                    title={
                      state.phase === "matchEnd"
                        ? "Play again"
                        : "Deal next round →"
                    }
                    onPress={() =>
                      state.phase === "matchEnd"
                        ? fresh()
                        : setState(game.newRound(state))
                    }
                  />
                </View>
              )}
              {state.hands[0].length > 0 && (
                <>
                  <View style={[s.row, { marginTop: 20 }]}>
                    <Text style={s.eyebrow}>YOUR HAND</Text>
                    <Text style={s.subtle}>
                      Bid {state.bids[0] ?? "—"} · Won {state.tricks[0]}
                    </Text>
                  </View>
                  <View style={s.hand}>
                    {state.hands[0].map((card: any) => (
                      <Card
                        key={card.id}
                        card={card}
                        disabled={
                          state.phase !== "bidding" &&
                          (!human || !legal.includes(card.id))
                        }
                        onPress={
                          state.phase === "playing"
                            ? () => {
                                try {
                                  setState(game.play(state, card.id));
                                } catch (e) {
                                  setError(String(e));
                                }
                              }
                            : undefined
                        }
                      />
                    ))}
                  </View>
                  <Text
                    style={[s.subtle, { textAlign: "center", marginTop: 8 }]}
                  >
                    Follow the lead suit whenever you can.
                  </Text>
                </>
              )}
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: reduced }}
                onPress={() => setReduced((v) => !v)}
                style={s.textButton}
              >
                <Text style={s.subtle}>
                  Quick bot turns: {reduced ? "on" : "off"}
                </Text>
              </Pressable>
            </ScrollView>
          )
        )}
      </View>
      <Modal
        visible={rules}
        transparent
        animationType="fade"
        onRequestClose={() => setRules(false)}
      >
        <View style={s.overlay}>
          <View style={s.modal}>
            <ScrollView>
              <Text style={s.eyebrow}>THE TABLE GUIDE</Text>
              <Text style={s.gameTitle}>
                A game of trust.{"\n"}And a little nerve.
              </Text>
              {[
                [
                  "01 / Pair up",
                  "You and Maya play against Jules and Leo. Everyone gets 13 cards. Spades are always trump.",
                ],
                [
                  "02 / Make your bid",
                  "Bid the number of tricks you expect to win, from 0 (nil) to 13. Your bids combine with your partner’s.",
                ],
                [
                  "03 / Follow the lead",
                  "Play the led suit if you have it. Otherwise play any card. You cannot lead spades until one has been played, unless you only have spades. Highest trump wins; otherwise highest card of the led suit wins. Winner leads next.",
                ],
                [
                  "04 / Count it up",
                  "Make your team bid: 10 points per bid trick, plus 1 per overtrick (bag). Miss it: lose 10 per bid trick. Every 10 bags costs 100 points. Nil earns 100 with zero tricks, or loses 100 otherwise; failed-nil tricks add bags and do not help your partner’s contract.",
                ],
                [
                  "05 / Reach 500",
                  "The higher-scoring team wins once a team reaches 500 at round end. A tie means another round. No blind nil, jokers, or first-trick restrictions in this version.",
                ],
                [
                  "Always yours",
                  "No sign-in, ads, or network needed for play. Your latest match is saved on this device. Deleting app data removes it.",
                ],
              ].map(([title, body]) => (
                <View key={title} style={{ marginVertical: 12 }}>
                  <Text style={s.sectionTitle}>{title}</Text>
                  <Text style={s.description}>{body}</Text>
                </View>
              ))}
              <Button
                title="Got it. Let’s play."
                onPress={() => setRules(false)}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={confirm}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirm(false)}
      >
        <View style={s.overlay}>
          <View style={s.modal}>
            <Text style={s.gameTitle}>A fresh table?</Text>
            <Text style={[s.description, { marginVertical: 20 }]}>
              Starting a new match replaces your saved game and resets both
              teams’ scores.
            </Text>
            <Button title="Start new match" onPress={fresh} />
            <View style={{ height: 10 }} />
            <Button
              title="Keep current match"
              secondary
              onPress={() => setConfirm(false)}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  shell: { flex: 1, width: "100%" },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: C.line,
  },
  logo: { color: C.text, fontWeight: "900", fontSize: 19, letterSpacing: 2 },
  headerLink: { color: C.gold, fontSize: 12, fontWeight: "600" },
  home: { padding: 24, paddingBottom: 32 },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  dot: { height: 6, width: 6, borderRadius: 3, backgroundColor: C.teal },
  eyebrow: {
    color: C.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.6,
  },
  heroTitle: {
    fontSize: 44,
    lineHeight: 49,
    color: C.text,
    fontFamily: "serif",
    marginTop: 20,
    marginBottom: 16,
  },
  description: { color: C.muted, fontSize: 14, lineHeight: 23 },
  feature: {
    marginTop: 28,
    backgroundColor: C.panel,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.line,
    overflow: "hidden",
  },
  featureTop: {
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pill: { color: C.gold, fontSize: 9, letterSpacing: 1.3, fontWeight: "700" },
  offline: { color: C.teal, fontSize: 10, letterSpacing: 1 },
  art: { width: "100%", height: 220, backgroundColor: "#0C1421" },
  featureBody: { padding: 22, gap: 14 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  gameTitle: {
    color: C.text,
    fontFamily: "serif",
    fontSize: 34,
    lineHeight: 40,
  },
  star: { fontSize: 36, color: C.gold },
  tags: { flexDirection: "row", gap: 8, marginBottom: 6 },
  tag: {
    fontSize: 9,
    letterSpacing: 1,
    color: C.muted,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 5,
    padding: 7,
  },
  button: {
    backgroundColor: C.gold,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  secondary: { backgroundColor: C.line },
  buttonText: { fontSize: 14, color: C.bg, fontWeight: "800" },
  textButton: { padding: 16, alignItems: "center" },
  subtle: { fontSize: 11, color: C.muted, lineHeight: 17 },
  sectionTitle: {
    fontSize: 14,
    color: C.text,
    fontWeight: "600",
    flexShrink: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: C.line,
    paddingTop: 24,
    marginTop: 28,
  },
  footerText: { fontSize: 8, color: C.muted, letterSpacing: 1.3 },
  gameContent: { padding: 18, paddingBottom: 32 },
  tableTitle: {
    fontSize: 24,
    color: C.text,
    fontFamily: "serif",
    marginTop: 8,
  },
  scoreboard: {
    flexDirection: "row",
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 16,
    padding: 18,
    marginVertical: 20,
  },
  scoreSide: { flex: 1, alignItems: "center" },
  score: { fontSize: 32, fontWeight: "600", color: C.text, marginVertical: 6 },
  scoreTarget: { fontSize: 12, color: C.muted },
  table: {
    height: 310,
    backgroundColor: "#12312F",
    borderRadius: 100,
    borderWidth: 5,
    borderColor: "#29403D",
    position: "relative",
  },
  tableOutline: {
    position: "absolute",
    top: 10,
    bottom: 10,
    left: 10,
    right: 10,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: "#466052",
  },
  player: { position: "absolute", alignItems: "center", width: 88 },
  north: { top: 14, left: "50%", marginLeft: -44 },
  west: { left: 0, top: 104 },
  east: { right: 0, top: 104 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#254D47",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#57736A",
  },
  activeAvatar: { borderColor: C.gold, borderWidth: 2 },
  avatarText: { color: C.text, fontWeight: "700" },
  playerName: { color: C.text, fontSize: 10, marginTop: 4 },
  playerDetail: { color: C.teal, fontSize: 10, marginTop: 3 },
  centerCards: {
    position: "absolute",
    top: 116,
    left: 65,
    right: 65,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 5,
  },
  tableSpade: { fontSize: 50, color: "#567869" },
  tableCaption: { color: "#82A093", fontSize: 8, letterSpacing: 2 },
  tableStatus: {
    position: "absolute",
    bottom: 22,
    alignSelf: "center",
    fontSize: 8,
    color: "#9BB5A4",
    letterSpacing: 1.4,
  },
  card: {
    width: 52,
    height: 78,
    backgroundColor: "#F6F0E4",
    borderRadius: 7,
    padding: 6,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#D3CAB7",
  },
  smallCard: { width: 39, height: 60, padding: 4 },
  playable: { borderColor: C.gold, borderWidth: 2 },
  cardRank: { fontSize: 15, fontWeight: "800" },
  cardSuit: { fontSize: 32, textAlign: "center" },
  playLabel: { fontSize: 8, color: C.text, marginTop: 3 },
  statusBar: { marginVertical: 16, alignItems: "center", gap: 5 },
  status: {
    color: C.gold,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  hand: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    marginTop: 14,
  },
  bidPanel: {
    padding: 18,
    borderRadius: 15,
    backgroundColor: C.panel,
    gap: 12,
  },
  bidControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  bidNumber: { fontSize: 32, color: C.text, minWidth: 52, textAlign: "center" },
  overlay: {
    flex: 1,
    backgroundColor: "#000B",
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
  },
  modal: {
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 520,
    maxHeight: "88%",
  },
  error: {
    backgroundColor: "#553D24",
    color: C.text,
    padding: 12,
    fontSize: 12,
    lineHeight: 18,
  },
});
