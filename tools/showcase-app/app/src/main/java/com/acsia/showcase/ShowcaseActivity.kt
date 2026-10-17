package com.acsia.showcase

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.flow.emptyFlow

// The deck's palette, so the car's centre screen matches the slides.
private val Background = Color(0xFFF7F9FC)
private val Card = Color(0xFFFFFFFF)
private val Navy = Color(0xFF1E3659)
private val Blue = Color(0xFF0057A8)
private val LightBlue = Color(0xFF6DC1EC)
private val Border = Color(0xFFD9DCEE)
private val Body = Color(0xFF4A5A72)
private val Muted = Color(0xFF5F6B7E)
private val Track = Color(0xFFE3E8F2)
private val Amber = Color(0xFFF2B43C)

private val Plex = FontFamily(Font(R.font.plex_sans_regular, FontWeight.Normal), Font(R.font.plex_sans_semibold, FontWeight.SemiBold))
private val Mono = FontFamily(Font(R.font.jetbrains_mono_regular))

private val STEPS = listOf("Plan", "Tech plan", "Test cases", "Tests", "Code", "Simulator run", "E2E agents", "Review")
private const val LOW_FUEL_PCT = 10

/** Fills the launcher's map panel: the session title, the car's live state and the eight steps behind the cluster. */
class ShowcaseActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val car = runCatching { carLine(this) }.getOrElse { emptyFlow() }
        setContent {
            val line by car.collectAsState(initial = CarLine())
            Showcase(line)
        }
    }
}

/** Sizes are in design px for a 760 × 470 panel and scale to whatever the launcher gives us. */
private class Scale(private val unit: Dp) {
    fun dp(v: Float): Dp = unit * v
    fun sp(v: Float): TextUnit = (unit.value * v).sp
}

@Composable
private fun Showcase(line: CarLine) {
    BoxWithConstraints(Modifier.fillMaxSize().background(Background)) {
        val s = Scale(minOf(maxWidth / 760f, maxHeight / 470f))
        Column(Modifier.fillMaxSize().padding(horizontal = s.dp(40f), vertical = s.dp(32f))) {
            Image(painterResource(R.drawable.acsia_logo), "Acsia", Modifier.height(s.dp(26f)))
            Spacer(Modifier.height(s.dp(26f)))
            Row(Modifier.weight(1f).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(s.dp(32f))) {
                TitleBlock(s, Modifier.weight(1f))
                LiveCard(line, s, Modifier.width(s.dp(250f)).fillMaxHeight())
            }
            Spacer(Modifier.height(s.dp(24f)))
            StepTracker(s)
        }
    }
}

@Composable
private fun TitleBlock(s: Scale, modifier: Modifier) {
    Column(modifier) {
        Text("INSTRUMENT CLUSTER DEMO · ANDROID AUTOMOTIVE",
            style = TextStyle(fontFamily = Mono, fontSize = s.sp(12f), letterSpacing = s.sp(1.6f), color = Blue))
        Spacer(Modifier.height(s.dp(12f)))
        Text("Agentic coding\nin practice",
            style = TextStyle(fontFamily = Plex, fontWeight = FontWeight.SemiBold, fontSize = s.sp(46f),
                lineHeight = s.sp(52f), letterSpacing = s.sp(-0.6f), color = Navy))
        Spacer(Modifier.height(s.dp(14f)))
        Text("The instrument cluster was planned, built and tested with Claude Code.",
            style = TextStyle(fontFamily = Plex, fontSize = s.sp(17f), lineHeight = s.sp(25f), color = Body))
    }
}

@Composable
private fun LiveCard(line: CarLine, s: Scale, modifier: Modifier) {
    val shape = RoundedCornerShape(s.dp(16f))
    Column(
        modifier.clip(shape).background(Card).border(s.dp(1.5f), Border, shape).padding(s.dp(22f)),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(s.dp(8f))) {
            Box(Modifier.width(s.dp(8f)).height(s.dp(8f)).clip(RoundedCornerShape(50)).background(LightBlue))
            Text("LIVE FROM THE CAR", style = TextStyle(fontFamily = Mono, fontSize = s.sp(11f), letterSpacing = s.sp(1.5f), color = Muted))
        }
        Spacer(Modifier.weight(1f))
        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(s.dp(8f))) {
            Text(line.speedMph?.toString() ?: "--",
                style = TextStyle(fontFamily = Plex, fontWeight = FontWeight.SemiBold, fontSize = s.sp(64f), lineHeight = s.sp(64f), color = Navy))
            Text("mph", style = TextStyle(fontFamily = Plex, fontSize = s.sp(18f), color = Body), modifier = Modifier.padding(bottom = s.dp(10f)))
        }
        Spacer(Modifier.weight(1f))
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(s.dp(14f))) {
            Box(Modifier.clip(RoundedCornerShape(s.dp(8f))).background(Navy).padding(horizontal = s.dp(12f), vertical = s.dp(4f))) {
                Text(line.gear ?: "–", style = TextStyle(fontFamily = Plex, fontWeight = FontWeight.SemiBold, fontSize = s.sp(20f), color = Color.White))
            }
            FuelBar(line.fuelPct, s, Modifier.weight(1f))
        }
    }
}

@Composable
private fun FuelBar(pct: Int?, s: Scale, modifier: Modifier) {
    val low = pct != null && pct <= LOW_FUEL_PCT
    Column(modifier, verticalArrangement = Arrangement.spacedBy(s.dp(5f))) {
        Text(pct?.let { "Fuel $it %" } ?: "Fuel -- %",
            style = TextStyle(fontFamily = Plex, fontSize = s.sp(14f), color = if (low) Color(0xFFB4541A) else Body))
        Box(Modifier.fillMaxWidth().height(s.dp(8f)).clip(RoundedCornerShape(50)).background(Track)) {
            if (pct != null) {
                Box(Modifier.fillMaxWidth((pct / 100f).coerceIn(0.02f, 1f)).fillMaxHeight()
                    .clip(RoundedCornerShape(50)).background(if (low) Amber else Blue))
            }
        }
    }
}

@Composable
private fun StepTracker(s: Scale) {
    Column(verticalArrangement = Arrangement.spacedBy(s.dp(10f))) {
        Text("BUILT IN EIGHT STEPS", style = TextStyle(fontFamily = Mono, fontSize = s.sp(11f), letterSpacing = s.sp(1.5f), color = Muted))
        Row(horizontalArrangement = Arrangement.spacedBy(s.dp(8f))) {
            STEPS.forEachIndexed { i, step ->
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(s.dp(6f))) {
                    // Decide, Build, Verify: the three phases from the slides, in three shades.
                    val colour = when (i) { in 0..2 -> LightBlue; in 3..4 -> Blue; else -> Navy }
                    Box(Modifier.fillMaxWidth().height(s.dp(5f)).clip(RoundedCornerShape(50)).background(colour))
                    Row(horizontalArrangement = Arrangement.spacedBy(s.dp(4f))) {
                        Text("%02d".format(i + 1), style = TextStyle(fontFamily = Mono, fontSize = s.sp(10f), color = Muted))
                        Text(step, maxLines = 1, style = TextStyle(fontFamily = Plex, fontSize = s.sp(11f), color = Navy))
                    }
                }
            }
        }
    }
}
