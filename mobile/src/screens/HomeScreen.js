// mobile/src/screens/HomeScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, RefreshControl
} from 'react-native';
import * as Location from 'expo-location';
import { getBreweries } from '../services/api';

const AMBER = '#B85A00';

export default function HomeScreen({ navigation }) {
  const [breweries, setBreweries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState(null);

  useEffect(() => {
    requestLocationAndLoad();
  }, []);

  const requestLocationAndLoad = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
        await loadBreweries(loc.coords.latitude, loc.coords.longitude);
      } else {
        await loadBreweries();
      }
    } catch (err) {
      await loadBreweries();
    }
  };

  const loadBreweries = async (lat, lng) => {
    try {
      const data = await getBreweries(lat, lng);
      setBreweries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filtered = breweries.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.city || '').toLowerCase().includes(search.toLowerCase())
  );

  const renderBrewery = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Brewery', { breweryId: item.id, breweryName: item.name })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.breweryName}>{item.name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {item.delivery_fee ? `$${item.delivery_fee} delivery` : 'Free delivery'}
          </Text>
        </View>
      </View>
      <Text style={styles.breweryMeta}>
        {item.city}, {item.state}
        {item.brewery_distance_km ? `  ·  ${(item.brewery_distance_km * 0.621371).toFixed(1)} mi` : ''}
        {item.min_order_amount ? `  ·  $${item.min_order_amount} min` : ''}
      </Text>
      <View style={styles.row}>
        <Text style={styles.openTag}>Open now</Text>
        <Text style={styles.eta}>30–45 min</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={AMBER} />
        <Text style={styles.loadingText}>Finding breweries near you...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search breweries or beer styles..."
          placeholderTextColor="#888"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderBrewery}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadBreweries(location?.latitude, location?.longitude); }}
            tintColor={AMBER}
          />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No breweries found nearby.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f8f5' },
  searchBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0ddd5',
  },
  searchInput: {
    backgroundColor: '#f2f1ed',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 15,
    color: '#1a1a1a',
  },
  list: { padding: 14 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 0.5,
    borderColor: '#e0ddd5',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  breweryName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', flex: 1 },
  badge: { backgroundColor: '#FAEEDA', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, color: '#854F0B', fontWeight: '500' },
  breweryMeta: { fontSize: 13, color: '#666', marginTop: 3, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  openTag: { fontSize: 11, color: '#3B6D11', backgroundColor: '#EAF3DE', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  eta: { fontSize: 12, color: '#888' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loadingText: { marginTop: 10, color: '#888', fontSize: 14 },
  emptyText: { color: '#888', fontSize: 15, textAlign: 'center' },
});
