import { useState, useRef } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { scanBarcode } from '../../lib/api';

// Barcode scanner. Uses expo-camera (expo-barcode-scanner is deprecated as of SDK 50).
// On detection: hits POST /api/scan and pushes the user to the Set Details screen.
export default function Scanner() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const handledRef = useRef(false);

  // Reset the "already handled" guard whenever the screen regains focus,
  // so the user can scan another item after navigating back.
  useFocusEffect(
    useCallback(() => {
      handledRef.current = false;
      setScanning(false);
    }, [])
  );

  // ──── Permission states ────
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={{ marginBottom: 12 }}>
          Camera permission is required to scan barcodes.
        </Text>
        <Button title="Grant permission" onPress={requestPermission} />
      </View>
    );
  }

  async function handleBarcode(barcode: string) {
    if (handledRef.current) return;
    handledRef.current = true;
    setScanning(true);

    try {
      const result = await scanBarcode(barcode);
      // Pass scan result through to the Set Details screen as JSON.
      router.push({
        pathname: '/scan/details',
        params: { result: JSON.stringify(result), barcode },
      });
    } catch (err: any) {
      // Re-allow scanning on error so the user can retry.
      handledRef.current = false;
      setScanning(false);
      // Fall back to manual entry on network/server errors.
      router.push({
        pathname: '/scan/details',
        params: {
          result: JSON.stringify({
            found: false,
            barcode,
            manual_entry_required: true,
            error: err.message,
          }),
          barcode,
        },
      });
    }
  }

  return (
    <View style={styles.fill}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'code128'],
        }}
        onBarcodeScanned={(e: BarcodeScanningResult) => handleBarcode(e.data)}
      />
      <View style={styles.overlay} pointerEvents="none">
        <Text style={styles.overlayText}>
          {scanning ? 'Looking up…' : 'Point at a barcode'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  overlay: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  overlayText: {
    color: '#fff',
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
  },
});
