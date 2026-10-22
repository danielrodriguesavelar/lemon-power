# Lemon Power

Aplicativo web em HTML, CSS e JavaScript puro para controlar um circuito de LED por Wi-Fi local usando a placa **NodeMCU ESP8266 ESP-12E Amica**. Esta placa não tem Bluetooth/BLE; por isso, esta versão usa o ponto de acesso Wi-Fi criado pelo próprio ESP8266. Não usa serviço externo para os comandos.

## Arquivos

- `index.html`, `style.css` e `script.js`: aplicativo web.
- `esp8266/lemon_power.ino`: sketch para Arduino IDE e NodeMCU ESP-12E.

## Como funciona

O sketch cria a rede Wi-Fi `LemonPower` protegida pela senha `lemonpower` e disponibiliza a API local em `http://192.168.4.1`. O aplicativo chama `/api/status` para consultar o estado e envia `ON` ou `OFF` para `/api/led`. O NodeMCU responde com o estado efetivamente aplicado, e a interface só atualiza o indicador físico após validar essa resposta.

O app é servido pelo computador na mesma rede local, enquanto o ESP8266 fornece a API. Por isso, abra a página no endereço IP local do computador, não em `localhost`: isso evita que o navegador trate a página como contexto seguro e bloqueie a chamada HTTP local.

## Executar o aplicativo

1. Grave o sketch no NodeMCU e ligue a placa.
2. No computador, conecte-se à rede Wi-Fi `LemonPower` usando a senha `lemonpower`. Como é um ponto de acesso local, a rede pode indicar que não há internet; mantenha a conexão.
3. Abra um terminal na pasta deste projeto e execute:

   ```powershell
   python -m http.server 8000 --bind 0.0.0.0
   ```

4. No Windows, abra `ipconfig` e anote o **Endereço IPv4** do adaptador Wi-Fi conectado à rede `LemonPower` (normalmente `192.168.4.2`).
5. No Chrome, abra `http://ENDERECO-IP-DO-COMPUTADOR:8000` — por exemplo, `http://192.168.4.2:8000`. Não use `localhost` nem `127.0.0.1` para esta conexão.
6. Toque em **Verificar conexão Wi-Fi**. Quando aparecer **Conectado por Wi-Fi**, use **LIGAR LED** e **DESLIGAR LED**.

Se o Firewall do Windows pedir autorização para o servidor Python, permita o acesso na rede privada local. A rede do ESP8266 só suporta o alcance do próprio ponto de acesso; não exige Internet.

### Abrir pelo celular

Conecte o computador que serve os arquivos e o celular à rede `LemonPower`. No celular, abra no Chrome o endereço `http://IP-DO-COMPUTADOR:8000` anotado no `ipconfig`. Isso depende de o celular alcançar o computador pelo ponto de acesso; se a rede ou o navegador bloquear a comunicação entre dispositivos, use o Chrome no próprio computador conectado ao ponto de acesso.

### Demonstração sem hardware

O botão **Iniciar demonstração** exibe controles e estado separados dos controles físicos, com o aviso **SIMULAÇÃO VISUAL — o LED físico não está sendo controlado**. A simulação não envia requisições ao NodeMCU nem afirma que o LED real está aceso.

## Instalar a Arduino IDE e suporte ESP8266

1. Instale a [Arduino IDE](https://www.arduino.cc/en/software).
2. Em **Arquivo > Preferências**, adicione `https://arduino.esp8266.com/stable/package_esp8266com_index.json` em **URLs adicionais para Gerenciador de Placas**.
3. Em **Ferramentas > Placa > Gerenciador de Placas**, procure por **esp8266** e instale a plataforma **ESP8266 by ESP8266 Community**.
4. Abra `esp8266/lemon_power.ino`.
5. Conecte a placa por USB. Em **Ferramentas > Placa**, selecione **NodeMCU 1.0 (ESP-12E Module)**, compatível com a NodeMCU ESP-12E Amica. Em **Ferramentas > Porta**, selecione a porta USB correspondente.
6. Confira a ligação ao GPIO indicada abaixo e clique em **Carregar**. Se necessário, mantenha pressionado **FLASH/BOOT** durante o início do envio. Abra o Monitor Serial em 115200 baud para ver o endereço da rede e os comandos confirmados.

## Materiais e ligação segura

- NodeMCU ESP8266 ESP-12E Amica e cabo USB adequado.
- Um ou mais limões.
- Dois metais diferentes por célula, como zinco e cobre.
- Multímetro.
- LED e resistor limitador calculado conforme as medições e as especificações do LED.
- Estágio de acionamento, como MOSFET canal N de nível lógico adequado, resistor de gate e resistor de pull-down.
- Protoboard e fios.

No sketch, o GPIO de controle é **D6 (GPIO12)**. Ele deve comandar somente a entrada do estágio de acionamento; não ligue o LED diretamente ao GPIO.

**Não conecte a pilha de limão à entrada de alimentação ou aos pinos do ESP8266.** Alimente a placa por USB ou por outra fonte adequada, separada da pilha. Um exemplo de acionamento de baixa corrente usa um MOSFET canal N no lado negativo: source no negativo da pilha, drain no cátodo do LED e ânodo ligado ao positivo da pilha em série com um resistor limitador calculado. Ligue o gate ao D6 por meio de um resistor adequado e use um pull-down entre gate e source. Para o GPIO comandar o gate, o negativo da pilha e o GND do NodeMCU precisam compartilhar uma referência comum; essa ligação não alimenta o NodeMCU. Confira a pinagem dos componentes com o professor antes de energizar.

A tensão e a corrente da pilha variam conforme os metais, limões, contatos e carga. Meça antes de ligar o LED. Uma pilha pode não fornecer corrente suficiente; células em série podem aumentar a tensão, mas não garantem corrente adequada. Se as medições forem insuficientes, informe essa limitação e não afirme que o LED funcionará com essa pilha.

## API local

- Ponto de acesso: `LemonPower` (senha `lemonpower`).
- Endereço do NodeMCU: `192.168.4.1`.
- `GET /api/status`: retorna `{"state":"ON"}` ou `{"state":"OFF"}`.
- `POST /api/led` com corpo `ON` ou `OFF`: atualiza o GPIO e responde com o estado confirmado.

Não há BLE nesta versão: o ESP8266 ESP-12E não possui rádio Bluetooth integrado. A comunicação de controle é feita apenas pela rede Wi-Fi local criada pela placa.

## Testes na escola e validação pendente

Nenhum teste físico foi realizado durante o desenvolvimento. Na escola:

1. Grave o programa e confirme no Monitor Serial que o ponto de acesso `LemonPower` iniciou no endereço `192.168.4.1`.
2. Conecte o computador à rede da placa e abra o aplicativo pelo endereço IP do computador, conforme os passos acima.
3. Verifique a conexão no site e use os dois botões; confira o estado no site e as mensagens no Monitor Serial.
4. Desconecte o Wi-Fi ou desligue o NodeMCU; confirme que a interface informa a perda de conexão e desabilita o controle. Reconecte e verifique novamente.
5. Com a alimentação desligada, confira com o professor a polaridade do LED, o resistor, a pinagem do MOSFET e o GND comum.
6. Meça a tensão e a corrente da pilha sob a carga planejada. Verifique se o LED funciona sem exceder os limites dos componentes.
7. Teste a demonstração visual separadamente, esclarecendo que ela não controla o hardware.

Não conecte a pilha diretamente ao NodeMCU. O funcionamento elétrico do LED com a pilha de limão e a conectividade no local precisam ser validados com o hardware real.
