package com.acsia.showcase

import android.car.Car
import android.car.VehiclePropertyIds
import android.car.hardware.CarPropertyValue
import android.car.hardware.property.CarPropertyManager
import android.content.Context
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlin.math.abs
import kotlin.math.roundToInt

/** What the showcase shows from the car. Null fields are not available (no permission, or no value yet). */
data class CarLine(val speedMph: Int? = null, val gear: String? = null, val fuelPct: Int? = null)

/** Speed, gear and fuel from CarPropertyManager. Emits nothing when the car service is not there. */
fun carLine(context: Context): Flow<CarLine> = callbackFlow {
    val car = Car.createCar(context)
    val props = car?.getCarManager(Car.PROPERTY_SERVICE) as? CarPropertyManager
    if (car == null || props == null) { close(); return@callbackFlow }
    val capacityMl = runCatching { props.getFloatProperty(VehiclePropertyIds.INFO_FUEL_CAPACITY, 0) }.getOrNull()
    var line = CarLine()
    trySend(line)
    val callback = object : CarPropertyManager.CarPropertyEventCallback {
        override fun onChangeEvent(v: CarPropertyValue<*>) {
            line = when (v.propertyId) {
                VehiclePropertyIds.PERF_VEHICLE_SPEED -> line.copy(speedMph = abs((v.value as Float) * MPS_TO_MPH).roundToInt())
                VehiclePropertyIds.GEAR_SELECTION -> line.copy(gear = gearLetter(v.value as Int))
                VehiclePropertyIds.FUEL_LEVEL -> capacityMl?.takeIf { it > 0f }
                    ?.let { line.copy(fuelPct = ((v.value as Float) / it * 100f).roundToInt()) } ?: line
                else -> line
            }
            trySend(line)
        }
        override fun onErrorEvent(propertyId: Int, areaId: Int) = Unit
    }
    for ((id, rate) in listOf(
        VehiclePropertyIds.PERF_VEHICLE_SPEED to 10f,
        VehiclePropertyIds.GEAR_SELECTION to 0f,
        VehiclePropertyIds.FUEL_LEVEL to 1f,
    )) {
        runCatching { props.registerCallback(callback, id, rate) }   // skipped without permission
    }
    awaitClose { props.unregisterCallback(callback); car.disconnect() }
}

/** The car reports speed in m/s; the cluster and the showcase show mph. */
private const val MPS_TO_MPH = 2.2369363f

private fun gearLetter(gear: Int) = when (gear) {
    0x4 -> "P"; 0x2 -> "R"; 0x1 -> "N"; 0x8 -> "D"
    else -> if (gear >= 0x10) "D" else "–"
}
