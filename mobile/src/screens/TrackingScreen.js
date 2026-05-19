// mobile/src/screens/TrackingScreen.js
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Animated
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { getOrder, trackOrder } from '../services/api';

const AMBER = '#B85A00';

const STATUS_STEPS = [
  { key: 'pending',          label: 'Order placed' },
  { key: 'accepted',         label: 'Brewery confirmed' },
  { key: 'preparing',        label: 'Packing your order' },
  { key: 'ready',            label: 'Ready for pickup' },
  { key: 'driver_assigned',  label: 'Driver on the way to brewery' },
  { key: 'en_route',         label: 'Beer is on the way!' },
  { key: 'delivered',        label: 'Delivered 🍺' },
];

export default function TrackingScreen({ route }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const mapRef = useRef(null);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadOrder();

    // Connect to real-time updates
    const unsubscribe = trackOrder(
      orderId,
      (loc) => {
        setDriverLocation({ latitude: loc.lat, longitude: loc.lng });
        // Animate map to driver
        mapRef.current?.animateToRegion({
          latitude: loc.lat, longitude: loc.lng,
          latitudeDelta: 0.02, longitudeDelta: 0.02
        }, 500);
      },
      (update) => {
        setOrder(prev => prev ? { ...prev, status: update.status } : prev);
        if (update.status === 'delivered') {
          Alert.alert('Delivered!', 'Enjoy your beer! 🍺');
        }
      }
    );

    // Pulse animation for active status dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.3, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();

    return unsubscribe;
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const data = await getOrder(orderId);
      setOrder(data);
    } catch (err) {
      console.error(err);
    }
  };

  if (!order) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading order...</Text>
      </View>
    );
  }

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === order.status);

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 38.2527,
          longitude: -85.7585,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {driverLocation && (
          <Marker coordinate={driverLocation} title="Your driver">
            <View style={styles.driverMarker}>
              <Text style={styles.driverMarkerText}>🚗</Text>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Status panel */}
      <ScrollView style={styles.panel}>
        {/* ETA header */}
        <View style={styles.etaHeader}>
          <View>
            <Text style={styles.etaLabel}>
              {order.status === 'delivered' ? 'Delivered!' : 'Estimated delivery'}
            </Text>
            <Text style={styles.etaTime}>
              {order.status === 'delivered' ? '🍺 Enjoy!' : '~30–45 min'}
            </Text>
          </View>
          <View style={styles.breweryChip}>
            <Text style={styles.breweryChipText}>{order.brewery_name}</Text>
          </View>
        </View>

        {/* Progress steps */}
        <View style={styles.steps}>
          {STATUS_STEPS.map((step, i) => {
            const done = i < currentStepIndex;
            const active = i === currentStepIndex;
            return (
              <View key={step.key} style={styles.stepRow}>
                <View style={styles.stepDotWrapper}>
                  {active ? (
                    <Animated.View style={[styles.stepDot, styles.stepDotActive, { transform: [{ scale: pulse }] }]}>
                      <Text style={styles.stepDotText}>●</Text>
                    </Animated.View>
                  ) : (
                    <View style={[styles.stepDot, done ? styles.stepDotDone : styles.stepDotPending]}>
                      <Text style={[styles.stepDotText, done ? styles.stepDotTextDone : styles.stepDotTextPending]}>
                        {done ? '✓' : (i + 1)}
                      </Text>
                    </View>
                  )}
                  {i < STATUS_STEPS.length - 1 && (
                    <View style={[styles.stepLine, done ? styles.stepLineDone : styles.stepLinePending]} />
                  )}
                </View>
                <Text style={[styles.stepLabel, active && styles.stepLabelActive, done && styles.stepLabelDone]}>
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* ID check reminder */}
        {order.status === 'en_route' && (
          <View style={styles.idReminder}>
            <Text style={styles.idReminderTitle}>🪪 Have your ID ready</Text>
            <Text style={styles.idReminderText}>
              Your driver will scan your ID before handing over your order. This is required by law.
            </Text>
          </View>
        )}

        {/* Order summary */}
        <View style={styles.orderSummary}>
          <Text style={styles.summaryTitle}>Order summary</Text>
          {(order.items || []).map((item, i) => (
            <View key={i} style={styles.summaryRow}>
              <Text style={styles.summaryItem}>{item.name} × {item.quantity}</Text>
              <Text style={styles.summaryPrice}>${parseFloat(item.subtotal).toFixed(2)}</Text>
            </View>
          ))}
          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.totalLabel}>Total paid</Text>
            <Text style={styles.totalAmount}>${parseFloat(order.total).toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f8f5' },
  map: { height: 200 },
  panel: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#888', fontSize: 14 },

  etaHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', padding: 16,
    borderBottomWidth: 0.5, borderBottomColor: '#e0ddd5',
  },
  etaLabel: { fontSize: 12, color: '#888' },
  etaTime: { fontSize: 22, fontWeight: '600', color: '#1a1a1a', marginTop: 2 },
  breweryChip: { backgroundColor: '#FAEEDA', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  breweryChipText: { fontSize: 12, color: '#854F0B', fontWeight: '500' },

  steps: { backgroundColor: '#fff', padding: 16, marginTop: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  stepDotWrapper: { width: 28, alignItems: 'center' },
  stepDot: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: '#EAF3DE' },
  stepDotActive: { backgroundColor: '#FAEEDA' },
  stepDotPending: { backgroundColor: '#f2f1ed' },
  stepDotText: { fontSize: 11, fontWeight: '600' },
  stepDotTextDone: { color: '#3B6D11' },
  stepDotTextPending: { color: '#aaa' },
  stepLine: { width: 2, height: 18, marginVertical: 1 },
  stepLineDone: { backgroundColor: '#EAF3DE' },
  stepLinePending: { backgroundColor: '#e0ddd5' },
  stepLabel: { fontSize: 14, color: '#888', marginLeft: 10, paddingTop: 2, paddingBottom: 18 },
  stepLabelActive: { color: '#1a1a1a', fontWeight: '500' },
  stepLabelDone: { color: '#888' },

  idReminder: {
    margin: 14, backgroundColor: '#FFF3E0', borderRadius: 12,
    padding: 14, borderWidth: 0.5, borderColor: '#FAC775',
  },
  idReminderTitle: { fontSize: 14, fontWeight: '600', color: '#633806', marginBottom: 4 },
  idReminderText: { fontSize: 13, color: '#854F0B', lineHeight: 18 },

  orderSummary: { backgroundColor: '#fff', margin: 14, borderRadius: 12, padding: 14 },
  summaryTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryItem: { fontSize: 14, color: '#555' },
  summaryPrice: { fontSize: 14, color: '#555' },
  summaryTotal: { borderTopWidth: 0.5, borderTopColor: '#e0ddd5', marginTop: 8, paddingTop: 10 },
  totalLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  totalAmount: { fontSize: 15, fontWeight: '600', color: AMBER },

  driverMarker: { backgroundColor: '#fff', borderRadius: 20, padding: 4, borderWidth: 1, borderColor: AMBER },
  driverMarkerText: { fontSize: 18 },
});
