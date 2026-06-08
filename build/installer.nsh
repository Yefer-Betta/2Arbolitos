; 2Arbolitos POS - NSIS Installer Custom Script
; Objetivo: resolver cuelgues de .onInit en Windows 10/11 con NSIS de electron-builder 26

; Habilitar log para diagnóstico
!macro customHeader
  RequestExecutionLevel admin
!macroend

; Mostrar bienvenida mínima antes de instalar (oneClick salta esto, pero por si acaso)
!macro customInit
  ; Inicialización ligera, sin tocar registro ni plugins
  SetOutPath "$INSTDIR"
  ; Pre-calcular espacio necesario (rápido)
  ${LogSet} on
!macroend

; Pre-instalación: crear logs
!macro customInstall
  ; Crear archivo de log en temp
  FileOpen $0 "$TEMP\2arbolitos_install.log" w
  FileWrite $0 "2Arbolitos POS - Install started at $\r$\n"
  FileWrite $0 "INSTDIR: $INSTDIR$\r$\n"
  FileWrite $0 "TEMP: $TEMP$\r$\n"
  FileClose $0
!macroend

; Post-instalación: registrar log
!macro customInstallMode
!macroend
