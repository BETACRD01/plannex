import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { Credit, PaymentMethod } from '../../types/credit.types';
import { uploadPaymentVoucher, submitCreditPayment } from '../../services/payment.service';
import { colors } from '../../theme/theme';

interface RegisterPaymentModalProps {
  visible: boolean;
  credit: Credit | null;
  initialAmount?: number;
  isAdmin: boolean;
  userId?: string;
  onClose: () => void;
  onPaymentSuccess: () => void;
}

export function RegisterPaymentModal({
  visible,
  credit,
  initialAmount,
  isAdmin,
  userId,
  onClose,
  onPaymentSuccess,
}: RegisterPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState<PaymentMethod>('transferencia');
  const [notes, setNotes] = useState('');
  const [pickedImage, setPickedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && credit) {
      const suggested = initialAmount !== undefined ? initialAmount : Number(credit.installment_amount);
      setAmount(suggested > 0 ? String(suggested) : '');
      setDate(new Date().toISOString().split('T')[0]);
      setMethod('transferencia');
      setNotes('');
      setPickedImage(null);
    }
  }, [visible, credit, initialAmount]);

  const handlePickImage = async (source: 'camera' | 'gallery') => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso denegado', 'Se necesita acceso a la cámara para fotografiar el comprobante.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 0.8,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso denegado', 'Se necesita acceso a la galería para seleccionar el comprobante.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
          base64: true,
        });
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        setPickedImage(result.assets[0]);
      }
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen: ' + err.message);
    }
  };

  const handleSubmit = async () => {
    if (!credit) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Monto Inválido', 'Por favor ingresa un monto válido mayor a 0.');
      return;
    }

    if (!pickedImage && !isAdmin) {
      Alert.alert('Comprobante Obligatorio', 'Debes adjuntar la foto o captura del comprobante bancario.');
      return;
    }

    setLoading(true);
    try {
      let voucherUrl: string | null = null;

      if (pickedImage && pickedImage.base64) {
        voucherUrl = await uploadPaymentVoucher(
          credit.id,
          pickedImage.base64,
          pickedImage.fileName || undefined,
          pickedImage.mimeType || 'image/jpeg'
        );
      }

      const prevBal = Number(credit.remaining_balance);
      const newBal = Math.max(0, prevBal - amountNum);

      await submitCreditPayment({
        creditId: credit.id,
        amount: amountNum,
        paymentMethod: method,
        paymentDate: date,
        previousBalance: prevBal,
        newBalance: newBal,
        voucherUrl,
        userNotes: notes || 'Pago reportado desde Plannex Móvil',
        adminNotes: isAdmin
          ? `Abono de $${amountNum.toFixed(2)} registrado desde App Admin`
          : `Pago reportado por cliente desde App Móvil ($${amountNum.toFixed(2)})`,
        createdBy: userId,
      });

      Alert.alert('¡Pago Registrado!', 'El abono ha sido procesado exitosamente.');
      onPaymentSuccess();
      onClose();
    } catch (err: any) {
      Alert.alert('Error al registrar abono', err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.headerRow}>
            <Text style={styles.modalTitle}>Reportar Pago</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSub}>{credit?.item_description}</Text>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Monto */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Monto Pagado ($ USD) *</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor={colors.textSubtle}
              />
            </View>

            {/* Fecha */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Fecha del Pago (YYYY-MM-DD) *</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="2026-10-26"
                placeholderTextColor={colors.textSubtle}
              />
            </View>

            {/* Método */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Método de Pago</Text>
              <View style={styles.methodRow}>
                {(['transferencia', 'deposito', 'de_una', 'efectivo'] as PaymentMethod[]).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.methodBtn, method === m && styles.methodBtnActive]}
                    onPress={() => setMethod(m)}
                  >
                    <Text style={[styles.methodBtnText, method === m && styles.methodBtnTextActive]}>
                      {m === 'transferencia' ? 'Transf.' : m === 'deposito' ? 'Depósito' : m === 'de_una' ? 'De Una' : 'Efectivo'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Comprobante */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Foto del Comprobante Bancario {!isAdmin ? '*' : ''}</Text>
              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  style={styles.pickImageBtn}
                  onPress={() => handlePickImage('camera')}
                >
                  <Text style={styles.pickImageBtnText}>📷 Tomar Foto</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.pickImageBtn, { marginLeft: 8 }]}
                  onPress={() => handlePickImage('gallery')}
                >
                  <Text style={styles.pickImageBtnText}>🖼 Galería</Text>
                </TouchableOpacity>
              </View>

              {pickedImage && (
                <View style={styles.imagePreviewBox}>
                  <Image source={{ uri: pickedImage.uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setPickedImage(null)}
                  >
                    <Text style={styles.removeImageText}>Quitar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Notas */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notas / Referencia Bancaria</Text>
              <TextInput
                style={styles.input}
                value={notes}
                onChangeText={setNotes}
                placeholder="Ej: Ref #001245 Banco Pichincha"
                placeholderTextColor={colors.textSubtle}
              />
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.submitBtnText}>
                Subir y Registrar Pago de ${parseFloat(amount || '0').toFixed(2)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    color: colors.textSubtle,
  },
  modalSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 16,
  },
  formScroll: {
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textLight,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 13,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 6,
  },
  methodBtn: {
    flex: 1,
    backgroundColor: colors.inputBg,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  methodBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  methodBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSubtle,
  },
  methodBtnTextActive: {
    color: colors.primary,
  },
  buttonsRow: {
    flexDirection: 'row',
  },
  pickImageBtn: {
    flex: 1,
    backgroundColor: colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pickImageBtnText: {
    color: colors.textLight,
    fontSize: 12,
    fontWeight: '700',
  },
  imagePreviewBox: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImageBtn: {
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.dangerLight,
    borderRadius: 8,
  },
  removeImageText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  submitBtnText: {
    color: colors.background,
    fontWeight: '900',
    fontSize: 14,
  },
});
