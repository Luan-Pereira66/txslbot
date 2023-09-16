#!/bin/bash

clear 

# cores de console
red='\033[1;31m'
green='\033[1;36m'
blue='\033[1;34m'
yellow='\033[1;33m'
end='\033[m'

rm -r assets/connection/qrcode
mkdir assets/connection/qrcode

echo -e "\n$green Conexão Excluída com Sucesso! $end"

echo -e "\n$yellow Dê $green sh start.sh $yellow no programa e inicie uma nova Conexão.$end"
