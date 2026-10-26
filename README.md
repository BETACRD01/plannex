# 🚀 Plannex: Sistema de Gestión de Créditos y Financiamiento

Plataforma integral para **financiar bienes (motos, celulares, electrodomésticos, etc.) y préstamos**, calcular planes de pago en cuotas (semanales, quincenales o mensuales), registrar abonos con comprobantes y emitir estados de cuenta con control de mora en tiempo real.

* 🌐 **Sitio Web en Vivo (Producción):** [https://plannex-chi.vercel.app](https://plannex-chi.vercel.app)
* 🐙 **Repositorio GitHub:** [https://github.com/BETACRD01/plannex](https://github.com/BETACRD01/plannex)
* 🗄️ **Backend Supabase:** Proyecto vinculado `feefwrtilzifxwyacrle` (Postgres 17, Storage & RLS)

---

## 🛠️ Funcionalidades Principales

1. **Registro de Créditos y Bienes:**
   * Registro completo del cliente (Nombres, Cédula / DNI, Teléfono WhatsApp, Dirección).
   * Detalle del bien financiado: Moto, Celular, Electrodomésticos o Préstamo, con número de serie, IMEI, placa o chasis.
   * Estructura financiera: Precio total de venta, Entrada inicial al contado, Tasa de interés, Deuda total y Saldo pendiente.

2. **Generador del Plan de Pagos (Amortización):**
   * Configuración de cuotas **semanales**, **quincenales** o **mensuales**.
   * Cálculo automático del valor de cada cuota y proyección del calendario de vencimientos.

3. **Registro de Abonos y Pagos en Cascada:**
   * Registro de cobro en ventanilla, transferencia bancaria, De Una o tarjeta.
   * Amortización matemática automática: si el cliente paga menos, se marca como cuota *parcial*; si paga la cuota completa, se marca *pagada*; si paga más (abono extraordinario), amortiza cuotas futuras o el capital.
   * Disminución del saldo en tiempo real; cuando el saldo llega a $0.00, el crédito se marca como **Cancelado/Liquidado**.

4. **Comprobantes y Evidencias:**
   * Subida de fotos, capturas de pantalla o recibos PDF directamente a Supabase Storage con visor en alta resolución.
   * Campo de notas y observaciones para auditoría.

5. **Control de Cuotas y Semáforo de Mora:**
   * 🟢 **Pagada:** Cuota liquidada al 100%.
   * 🟡 **Parcial:** Cuota con abono parcial pendiente de completar.
   * 🔵 **Pendiente:** Cuota futura por vencer.
   * 🔴 **Vencida:** Cuota con cálculo automático de días de retraso acumulados.

6. **Estado de Cuenta Imprimible:**
   * Ficha completa del crédito lista para imprimir o descargar en PDF con formato formal de cobranzas y áreas de firmas.

---

## 💻 Comandos de Ejecución Local

```bash
# Instalar dependencias
npm install

# Iniciar servidor web de desarrollo
npm run dev:web

# Compilar todo el monorepo
npm run build
```
