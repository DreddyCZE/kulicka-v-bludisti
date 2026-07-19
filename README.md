# Kulička v bludišti

Mobilní webová hra pro Android telefon nebo tablet. Kulička se ovládá nakláněním zařízení pomocí senzoru `DeviceOrientation`. Jako záložní ovládání funguje tažení prstem.

## Spustit hru

Po aktivaci GitHub Pages bude hra dostupná zde:

**https://dreddycze.github.io/kulicka-v-bludisti/**

## Funkce

- náhodně generované bludiště
- ovládání náklonem telefonu nebo tabletu
- kalibrace neutrální polohy
- dotykové ovládání pro testování
- tři obtížnosti
- čas a počet pokusů
- instalace jako PWA
- offline cache přes service worker
- automatické publikování přes GitHub Actions

## Vývoj

Zdrojová verze je větev `main`. Každý push do `main` spustí workflow `.github/workflows/deploy-pages.yml` a publikuje aktuální verzi na GitHub Pages.

## Lokální spuštění

```bash
python -m http.server 8000
```

Potom otevři `http://localhost:8000`. Pohybové senzory na telefonu obvykle vyžadují HTTPS, proto je pro test gyroskopu vhodná nasazená GitHub Pages verze.
