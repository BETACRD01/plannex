import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, Image } from 'react-native';
import { colors } from '../../theme/theme';

interface FullscreenVoucherModalProps {
  voucherUrl: string | null;
  onClose: () => void;
}

export function FullscreenVoucherModal({ voucherUrl, onClose }: FullscreenVoucherModalProps) {
  return (
    <Modal
      visible={Boolean(voucherUrl)}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.closeText}>✕ Cerrar</Text>
        </TouchableOpacity>
        {voucherUrl ? (
          <Image
            source={{ uri: voucherUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: colors.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  closeText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 12,
  },
  image: {
    width: '100%',
    height: '80%',
  },
});
