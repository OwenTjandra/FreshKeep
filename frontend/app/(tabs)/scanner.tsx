import { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRouter, useFocusEffect } from 'expo-router';

import { scanBarcode } from '../../lib/api';
import { colors, fonts, space } from '../../lib/theme';
import { Button } from '../../components/Button';

export default function Scanner() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const handledRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      handledRef.current = false;
      setScanning(false);
    }, [])
  );

  if (!permission) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permission}>
        <Text style={styles.title}>Camera access</Text>
        <Text style={styles.body}>FreshKeep needs the camera to scan barcodes.</Text>
        <View style={{ marginTop: space.lg }}>
          <Button title="Grant permission" onPress={requestPermission} />
        </View>
      </View>
    );
  }

  async function handleBarcode(barcode: string) {
    if (handledRef.current) return;
    handledRef.current = true;
    setScanning(true);
    try {
      const result = await scanBarcode(barcode);
      router.push({
        pathname: '/scan/details',
        params: { result: JSON.stringify(result), barcode },
      });
    } catch (err: any) {
      handledRef.current = false;
      setScanning(false);
      router.push({
        pathname: '/scan/details',
        params: {
          result: JSON.stringify({ found: false, barcode, manual_entry_required: true, error: err.message }),
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

      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarText}>Scan barcode</Text>
      </View>

      {/* Scan frame with corner brackets */}
      <View style={styles.frameWrap} pointerEvents="none">
        <View style={styles.frame}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <Text style={styles.hint}>{scanning ? 'Looking up…' : 'Align barcode within the frame'}</Text>
      </View>
    </View>
  );
}

const FRAME_WIDTH = 240;
const FRAME_HEIGHT = 160;
const CORNER = 30;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },

  permission: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: space.xl,
    paddingTop: space['2xl'] * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fonts.serif, fontSize: 28, fontWeight: '800', color: colors.ink, marginBottom: space.sm },
  body:  { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center', maxWidth: 280 },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: 50, paddingBottom: space.md, paddingHorizontal: space.lg,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  topBarText: { color: '#fff', fontFamily: fonts.body, fontSize: 14, letterSpacing: 0.5 },

  frameWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  frame: {
    width: FRAME_WIDTH, height: FRAME_HEIGHT, borderRadius: 16,
    borderWidth: 2, borderColor: colors.accent,
  },
  corner: {
    position: 'absolute', width: CORNER, height: CORNER,
    borderColor: colors.accent, borderWidth: CORNER_THICKNESS,
  },
  cornerTL: { top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 16 },
  cornerTR: { top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 16 },
  cornerBL: { bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 16 },
  cornerBR: { bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 16 },

  hint: {
    color: 'rgba(255,255,255,0.85)', fontFamily: fonts.body, fontSize: 14,
    marginTop: 24, paddingHorizontal: 16, paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 6,
  },
});
