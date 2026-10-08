# 📐 HydroPulse Mathematical & Algorithmic Foundations

## 1. Fluid-Structure Acoustic Wave Mechanics (Korteweg Formula)

Sound propagation in a fluid-filled elastic conduit deviates significantly from the acoustic speed of sound in unconfined water ($c_0 \approx 1482\text{ m/s}$) due to structural pipe wall compliance. 

Under the **Korteweg-Allievi formulation**, the radial strain induced in the elastic pipe wall absorbs kinetic pressure energy:

$$v_s = \sqrt{\frac{K / \rho}{1 + \left(\frac{K}{E}\right)\left(\frac{D}{e}\right)}}$$

### Parameters:
* $K = 2.15 \times 10^9 \text{ N/m}^2$ (Bulk modulus of water at $20^\circ\text{C}$)
* $\rho = 1000 \text{ kg/m}^3$ (Density of water)
* $E = 2.0 \times 10^{11} \text{ N/m}^2$ (Young's modulus of Ductile Iron Class K9)
* $D = 0.40 \text{ m}$ (Nominal pipe bore diameter, $400\text{ mm}$)
* $e = 0.012 \text{ m}$ (Nominal wall thickness, $12\text{ mm}$)

### Evaluation:
$$\frac{K}{E} = \frac{2.15 \times 10^9}{2.0 \times 10^{11}} = 1.075 \times 10^{-2}$$
$$\frac{D}{e} = \frac{0.40}{0.012} = 33.333$$
$$\text{Elasticity Factor} = \left(\frac{K}{E}\right)\left(\frac{D}{e}\right) = 0.3583$$
$$v_s = \sqrt{\frac{2.15 \times 10^6}{1 + 0.3583}} = \sqrt{\frac{2.15 \times 10^6}{1.3583}} = \sqrt{1,582,860} \approx 1,258.12 \text{ m/s}$$

---

## 2. Generalized Cross-Correlation with Phase Transform (GCC-PHAT)

Given two acoustic sensor signals $x_1(t)$ and $x_2(t)$:
$$x_1(t) = s(t - t_1) + n_1(t)$$
$$x_2(t) = s(t - t_2) + n_2(t)$$
where $s(t)$ is the acoustic transient burst originating at the pipe rupture, $n_1(t), n_2(t)$ are uncorrelated noise processes, and $\Delta t = t_2 - t_1$.

The cross-power spectral density $G_{12}(\omega)$ is:
$$G_{12}(\omega) = X_2(\omega) \cdot X_1^*(\omega)$$

Under the **Phase Transform (PHAT)** weighting filter:
$$\psi_{\text{PHAT}}(\omega) = \frac{1}{|G_{12}(\omega)|}$$

The whitened cross-correlation function is:
$$R_{x_1 x_2}^{\text{PHAT}}(\tau) = \frac{1}{2\pi} \int_{-\infty}^{\infty} \frac{X_2(\omega) X_1^*(\omega)}{|X_2(\omega) X_1^*(\omega)|} e^{j \omega \tau} d\omega$$

Because all magnitude information is whitened to unity across the passband, acoustic reverberations, pipe cavity resonances, and colored ambient noise are suppressed, leaving an ideal Dirac delta $\delta(\tau - \Delta t)$.

---

## 3. Sub-Sample Parabolic Interpolation

Discrete Fourier Transform samples cross-correlation at integer sample intervals $k = \tau \cdot f_s$. To resolve time delays below the sampling period ($T_s = 100\ \mu\text{s}$ at $10\text{ kHz}$), a 3-point parabolic interpolation is fitted around the discrete maximum bin $k_{\text{peak}}$:

$$\delta = \frac{R(k_{\text{peak}} - 1) - R(k_{\text{peak}} + 1)}{2 \left(R(k_{\text{peak}} - 1) - 2 R(k_{\text{peak}}) + R(k_{\text{peak}} + 1)\right)}$$

$$\Delta t = \frac{k_{\text{peak}} + \delta}{f_s}$$

This yields microsecond-grade resolution ($\pm 0.05\text{ ms}$), corresponding to sub-meter physical localization accuracy:

$$\text{Spatial Resolution} = \frac{v_s \cdot \Delta t_{\text{res}}}{2} \approx \frac{1258.1 \times 10^{-4}}{2} \approx 0.06\text{ m} = 6\text{ cm}$$

---

## 4. TDOA Spatial Trilateration

Along a 1D linear pipe segment of known length $L$:
$$d_1 + d_2 = L$$
$$d_2 - d_1 = v_s \cdot \Delta t$$

Solving for $d_1$ (distance from Sensor Node A):
$$2 d_1 = L - v_s \cdot \Delta t \implies d_1 = \frac{L - v_s \cdot \Delta t}{2}$$
