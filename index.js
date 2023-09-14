// requisição baileys
const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState
} = require('@whiskeysockets/baileys');

// requisição node_modules
const fs = require('fs')
const axios = require('axios');

// configuração simples do bot
const config = JSON.parse(fs.readFileSync('./data/dono/dono.json', 'utf8'));
const configUrl = JSON.parse(fs.readFileSync('./data/media/img-url/urls.json', 'utf8'));
const premium_list = JSON.parse(fs.readFileSync('./data/premium/listPremium.json', 'utf8'));
const registro = JSON.parse(fs.readFileSync('./data/registro/registro.json', 'utf8'));

var quantidade_messagem = 0;

// obtendo valores do JSON config dono
var prefix = config.prefixo;
var nomeDono = config.nomeDono;
var nomeBot = config.nomeBot;
var emoji = config.emoji;
var numeroDono = config.numeroDono;
var numeroBot = config.numeroBot;
const passwrdOwner = '8421'

// urls de imagens
var imageMenu = configUrl.menu;
var imagemGpt = configUrl.respostaGPT;
var imageMenuDono = configUrl.imageMenuDono;

// importante funcoes personalizadas e menus 
const { menu } = require('./data/menus/menu')
const { menuDono } = require('./data/menus/menuDono')
const Messages = require('./functions/send/messages.js')
const SettingGroup = require('./functions/group/settingsGroup')
const ProfileBot = require('./functions/profileBot/profileBot')
const downloaderMidia = require('./functions/download-midia/index')

// fução de start
async function startBot(){
  // salvando autenticação do bot
  const { state, saveCreds } = await useMultiFileAuthState('./assets/connection/qrcode')

  // estanciando o bot
  const bot = makeWASocket({
    defaultQueryTimeoutMs: undefined,
    printQRInTerminal: true,
    auth: state
  })

  
  // update de status do bot
  bot.ev.on('connection.update', (update) => {

    const { connection, lastDisconnect } = update

    if (connection === 'close') {
      // identificador de erro de 'sem conexão'
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut

      console.log('Conexão Fechada')

      // se fechar conexão, reconecte
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === 'open') {
      console.log('Conexão Aberta')
    }
  })

  // Salvar conexão no diretório 
  bot.ev.on('creds.update', saveCreds)

  // evento de receber mensagem 
  bot.ev.on('messages.upsert', async ({ messages }) => {
    const messageBot = messages[0]

    //console.log(messageBot)

    // verificando se alguem entrou ou saiu do grupo
    const userMemberUpdate = messageBot.messageStubParameters;
    const userUpdateGroup = {
      contacts: userMemberUpdate,
      status: messageBot.messageStubType,
      AdminAuthor: messageBot.participant,
      keys: messageBot.key
    }

    // Recebendo objeto de se alguem entrou no grupo
    var newUserGroup = false;
    
    if(userUpdateGroup.status % 2 === 1){
      newUserGroup = true; // novo usuario o grupo
    }

    // Ativador de comandos lógicos.
    const configActivators = JSON.parse(fs.readFileSync('./data/actives-cmd/activator.json', 'utf8')); 
    
    const boasvindas = configActivators.boasvindas;

    // dando boas vindas
    if(newUserGroup && boasvindas){
      id = userUpdateGroup.keys.remoteJid;
      await bot.sendMessage(id, {text: `Olá, Seja bem vindo ao grupo.`})
    }
    
  
    // caso não tem mensagem, não faça nada.
    if (!messageBot?.message) {
      return;
    }

    try {

      
      // verificando tipo da mensagem
      const isTextMessage = messageBot.message?.conversation
      const isTextMessageExtended = messageBot.message?.extendedTextMessage?.text
      const isTextFromImage = messageBot.imageMessage?.caption
  
      const fullMessage = isTextMessage || isTextMessageExtended || isTextFromImage
      var FULL_MESSAGE_NEW;
  
      // Verificando se a mensagem é válida
      if (!fullMessage) {
        return;
      }

      // Objeto da mensagem pronta
      if (!fullMessage) {
        FULL_MESSAGE_NEW = {
          from: '',
          fullMessage: '',
          command: '',
          args: '',
          isMessage: false
        }
      }


      // se for uma imagem
      const isImage = !!messageBot.message?.imageMessage || !!messageBot.message?.isTextMessageExtended?.contextInfo?.quotedImage?.imageMessage
  
      // abstraindo argumento da mensagem [trim: tirando espaços L & R -|- split: quebrando msg no espaço encotrado]
      const [command, ...args] = fullMessage.trim().split(' ') // retorna uma array => [0] = cmg [1...] = args
      const arg = args.reduce((acc, arg) => acc + ' ' + arg, '').trim() // pegará o resto do array e transformará-lo em uma full-string
  
      // é grupo ou pv?
      const chat = messages[0].key.remoteJid.endsWith('@g.us')//messageBot.message?.conversation
      const userType = messages[0].key.fromMe

      var isGroup = chat ? true : false
      var isOwner = false
      var isBot = userType ? true : false

      // congiguraçoes de ajuda e praticidade
      const from = messages[0].key.remoteJid
      const pushName = messageBot.pushName
      const participant = messages[0].key.participant
      
      // Informaçoes de um grupo
      const groupMetadata = isGroup ? await bot.groupMetadata(from) : ''
      const groupName = isGroup ? groupMetadata.subject : ''
      const groupDesc = isGroup ? groupMetadata.desc : ''
      const groupMembers = isGroup ? groupMetadata.participants : ''

      var isAdmin = false;
      var isBotAdmin = false;
      const isPremium = premium_list.includes(participant) || premium_list.includes(from);
       
      var listMembersGroupID = []
      var listMembersAdminsGroupID = []
  
      // pegando membros do grupo
      if(isGroup){
        for(let i = 0; i < groupMembers.length; i++){
          listMembersGroupID.push(groupMembers[i].id)
  
          if(groupMembers[i].admin === 'admin'){
            listMembersAdminsGroupID.push(groupMembers[i].id)
          } else if (groupMembers[i].admin === 'superadmin'){
            listMembersAdminsGroupID.push(groupMembers[i].id)
          }
        }
      }

      // verificando se é adm
      if(listMembersAdminsGroupID.includes(participant)){
        isAdmin = true
      }
  
      // verificando se o bot é adm
      if(listMembersAdminsGroupID.includes(`${numeroBot}@s.whatsapp.net`)){
        isBotAdmin = true
      }

      // verificando se é o dono do bot
      if(participant === `${numeroDono}@s.whatsapp.net`){
        console.log(from, participant)
         isOwner = true
      }

      // Mostrando o "online" para contatos
      bot.sendPresenceUpdate('available', from)

      
      // const de ativação de menus  
      const antilink = configActivators.antilink;
      
      
      // verificando se é comando
      let enterSwitch = false
      if(fullMessage && fullMessage.startsWith(prefix)){
        enterSwitch = true;
        FULL_MESSAGE_NEW = {
          from: from,
          fullMessage: fullMessage,
          command: command.replace(prefix, '').trim(),
          args: arg.trim(),
          isImage
        }  
      } else {
        FULL_MESSAGE_NEW = {
          from: from,
          fullMessage: fullMessage,
          command: '',
          args: arg.trim(),
          isImage
        }  
      }

      // Verificando se é registrado
      const isRegistro = registro.some((item) => item.remoteJid === participant);
            
      // Verificando se é link
      const body = fullMessage;
      var isLink = false

      if(body.includes('https://')){
        if(!isGroup) return;
        if(isOwner) return;
        if(isAdmin) return;
        if(isPremium) return;

        isLink = true
      }
      
      // Instanciando objetos da funcoes personalizadas
      const wpp = new Messages(bot, from, messageBot);
      const settingGrp = new SettingGroup(bot, from);
      const profileBot = new ProfileBot(bot, from)

      const Command = FULL_MESSAGE_NEW.command;

      // se for link...
      if(antilink && isBotAdmin){
        if(isLink){
          wpp.enviar("Ban!\n\nTenha autorização para o envio de links.")
          await bot.groupParticipantsUpdate(
          from, 
          [`${participant}`],
          "remove"// replace this parameter with "remove", "demote" or "promote"
          )
        }
      }
      
      
      quantidade_messagem++;
      if(quantidade_messagem > 3){
        console.log("\033[H\033[2J") // limpa o console a cada 10 mensagem
        quantidade_messagem = 0;
      }   

      
      // Imprimir a mensagem
      console.log('\033[1;33mNOME BOT: \033[1;34m'
        +nomeBot
        +'\033[1;33m\n====================================\nUsuário: \033[1;34m'
        +pushName
        +'\033[1;33m\nComando: \033[1;34m'
        +Command
        +'\033[1;33m\nGrupo: \033[1;34m'
        +groupName
        +'\033[1;33m\nLink: \033[1;34m'
        +isLink
        +'\033[1;33m\nDono: \033[1;34m'  
        +isOwner
        +'\033[1;33m\n====================================\n\n')

      

      
      // se for pra entrar o switch
      if(enterSwitch){
        switch(Command.toLowerCase()){
          case 'ctt':
            id = '559883528062'
            const [result] = await bot.onWhatsApp(id)
            if (result.exists) console.log(result)
            break
            

          case 'img':
            if(!FULL_MESSAGE_NEW.isImage) return wpp.enviar('Por favor, envie uma img.')
            await downloaderMidia(bot);
            wpp.enviar('Baixando midia')
            break

            
          case 'login': case 'rg': case 'registro':
            if(!isGroup) return wpp.enviar('🤖 Apenas em grupo...')
            if(isRegistro) return wpp.enviar('🤖 Você já está em nosso Banco de Dados, não precisa registra-se novamente.')
            
            moedasLogin = 100;
            
            nome = arg
            if(!nome) return wpp.enviar('🤖 Envie seu nick\n\nEx.: '+prefix+'login lord-troll')

            rg = {
              "nome": moedasLogin,
              "saldo": 100,
              "remoteJid": participant
            }
            
            registro.push(rg)

            wpp.enviar('🤖 Opan, bem-vindo ao registro. Você fez login, e ganhou'+ moedasLogin +'moedas para usar com o bot.')

            fs.writeFileSync('./data/registro/registro.json', JSON.stringify(registro, null, 2))

            
            break

          case 'adivinhar':
            if(!isGroup) return wpp.enviar('🤖 Apenas em grupo.')
            if(!isRegistro) return wpp.enviar('🤖 Você não está registra. Esse comando serve para ganhar moedas. Resgistre-se no nosso banco de dados: '+prefix+'rg (seu nick)')
            
            chute = arg;
            
            if(!chute) return wpp.enviar('🤖 Estou aqui sempre pensando em um número de 1 a 10.\n\nVocê quer ganhar moedas no bot?\nUse: '+prefix+'adivinhar (um numero de 1 a 10)')

            // num aleatorio de 1 a 10
            random = Math.floor(Math.random() * 10) + 1;

            // Gera um número aleatório entre 10 e 500 para depositar
            deposito = Math.floor(Math.random() * (500 - 10 + 1) + 10);

            if(chute == random){
              registro.some((user) => {
                if (user.remoteJid === participant) {
                  user.saldo += deposito;
                }
              });
              
              // salvando alterações
              fs.writeFileSync('./data/registro/registro.json', JSON.stringify(registro, null, 2))

              wpp.enviar(`🤖 *Parabéns, você acertou!!* Estava pensnado no número *${random}.*\n\nVocê ganhou R$ ${deposito},00\n\nPara verificar seu saldo use: ${prefix}saldo`)
            } else {
              wpp.enviar(`🤖 Ops :(\n\nNão foi dessa vez. Eu estava pensando no número ${random}`)
            }
            
            
            break


          case 'saldo':
            if(!isGroup) return wpp.enviar('🤖 apenas em grupo.')
            if(!isRegistro) return wpp.enviar('🤖 Registre-se primeiro.')

            wpp.enviar(`🤖 Buscando...`)
            
            url = 'https://animasite.com.br/wp-content/uploads/2022/10/21118312_6428425-scaled.jpg'

           registro.some((user) => {
            if (user.remoteJid === participant) {
              wpp.enviarImagem(url, `🤖💰 *Setor Financeiro:*\n\n*Cliente:* ${user.nome}\n*Grupo:* ${groupName}\n*Saldo:* R$ ${user.saldo},00`);
            }
          });

            break

    
          case 'menu':
            
            mn = menu(pushName, emoji, prefix, nomeBot, nomeDono)
            url = imageMenu
            wpp.enviarImagem(url, mn)
            break

            
          case 'menudono':
            if(!isGroup)  return wpp.enviar(`🤖 Devido a atualizações da API do meu programa, este comando só funcionará em grupos.`)
            if(!isOwner) return wpp.enviar(`🤖 ${pushName}, esse comando é exclusivo para meu dono, ${nomeDono}.`)
            
            mn = menuDono(pushName, emoji, prefix, nomeBot, nomeDono)
            url = imageMenuDono
            return wpp.enviarImagem(url, mn)
          
            
            break
          case 'ping':

            wpp.enviar('🤖 *Pong* 🏓\n\n👨‍💻 *User:* '+ pushName +'\n⚙️ *BotName:* '+ nomeBot +'\n\n*Bot On💡⚡*\n---------------------------------------------------------------------------')

            break

            
        case "premium":
            if(isGroup && !isAdmin) return wpp.enviar("🤖 Você não tem autorização para esse comando, apelas o ADM.")
            if(isGroup && !isBotAdmin) return wpp.enviar("🤖 Desculpe, mas é um preciso que eu seja Admin.")

            // verificando se é uma menção "@"
            q = arg;
            

            if(!q) return wpp.enviar("🤖 Você precisa informar um numero de ctt para o fazer premium\n\nEx.: "+prefix+"premium 559883528066\n\nForma Correta: (prefixo)premium 55(DDD)(Numero sem o 9 na frente).")

            try {
              x = parseInt(q); // nao pode conter caracter nem letra
              if (isNaN(x)) return wpp.enviar("Não utilise letras, espaços ou caracteres: ")
              
              premium_list.push(`${q}@s.whatsapp.net`)

              fs.writeFileSync('./data/premium/listPremium.json', JSON.stringify(premium_list))
              wpp.enviar("⚙️ Usuário Premium adicionado.")
            } catch(err){
              wpp.enviar('🤖 Hmmm...\nParece que não foi possível registrá-lo como premium. Tente Novamente.')
            }
            
            break
            
            
          case "nomegp":
            if(!isGroup) return wpp.enviar('🤖 Apenas em grupo, amigo.')
            if(!isAdmin) return wpp.enviar('🤖 Membro comum detectado, você não pode utilizar esse comando.')
            if(!isBotAdmin) return wpp.enviar('🤖 É necessário que eu seja admin.')

            q = arg

            if(!q) return wpp.enviar("🤖 Qual o novo nome do grupo?\n\nUse: "+prefix+"nomegp <nome>")
            
            settingGrp.updateGroupName(q)

            wpp.enviar('🤖 Nome alterado com sucesso.')
            break
            
            
          case "descgp":
            if(!isGroup) return wpp.enviar('🤖 Apenas em grupo, amigo.')
            if(!isAdmin) return wpp.enviar('🤖 Membro comum detectado, você não pode utilizar esse comando.')
            if(!isBotAdmin) return wpp.enviar('🤖 É necessário que eu seja admin.')

            q = arg

            if(!q) return wpp.enviar("🤖 Qual a nova descrição do grupo?\n\nUse: "+prefix+"descgp <texto>")
            
            settingGrp.updateDescriptionGroup(q)

            wpp.enviar('🤖 Descrição alterada com sucesso.')
            break

      
          case 'ban': case 'banir':
            if(!isGroup) return wpp.enviar('🤖 Apenas em grupo, amigo.')
            if(!isAdmin) return wpp.enviar('🤖 Membro comum detectado, você não pode utilizar esse comando.')
            if(!isBotAdmin) return wpp.enviar('🤖 É necessário que eu seja admin.')

            q = arg

            if(!q) return wpp.enviar("🤖 Qual o ctt?\n\nUse: "+prefix+"ban 559883528066")
            
            settingGrp.updateMembersGroup('rem', q)
            break

            
          case 'add': case 'adicionar':
            if(!isGroup) return wpp.enviar('🤖 Apenas em grupo, amigo.')
            if(!isAdmin) return wpp.enviar('🤖 Membro comum detectado, você não pode utilizar esse comando.')
            if(!isBotAdmin) return wpp.enviar('🤖 É necessário que eu seja admin.')

            q = arg

            if(!q) return wpp.enviar("🤖 Qual o ctt?\n\nUse: "+prefix+"add 559883528066")
            
            await bot.groupParticipantsUpdate(
            from, 
            [`${q}@s.whatsapp.net`],
            'add' // replace this parameter with "remove", "demote" or "promote"
            )
            break

            
          case 'promover': case 'admin':
            if(!isGroup) return wpp.enviar('🤖 Apenas em grupo, amigo.')
            if(!isAdmin) return wpp.enviar('🤖 Membro comum detectado, você não pode utilizar esse comando.')
            if(!isBotAdmin) return wpp.enviar('🤖 É necessário que eu seja admin.')

            q = arg

            if(!q) return wpp.enviar("🤖 Qual o ctt?\n\nUse: "+prefix+"admin 559883528066")
            
            settingGrp.updateMembersGroup('pro', q)
            wpp.enviar("🤖 Membro Promovido")
            break

            
          case 'rebaixar': case 'notadmin':
            if(!isGroup) return wpp.enviar('🤖 Apenas em grupo, amigo.')
            if(!isAdmin) return wpp.enviar('🤖 Membro comum detectado, você não pode utilizar esse comando.')
            if(!isBotAdmin) return wpp.enviar('🤖 É necessário que eu seja admin.')

            q = arg

            if(!q) return wpp.enviar("🤖 Qual o ctt?\n\nUse: "+prefix+"notadmin 559883528066")
            
            settingGrp.updateMembersGroup('dem', q)
            wpp.enviar("🤖 Admin demitido kk")
            break

                  
          case 'fechargp':
            if(!isGroup) return wpp.enviar('🤖 Apenas em grupo, amigo.')
            if(!isAdmin) return wpp.enviar('🤖 Membro comum detectado, você não pode utilizar esse comando.')
            if(!isBotAdmin) return wpp.enviar('🤖 É necessário que eu seja admin.')

            settingGrp.updateSettingsGroup("abrir")
            wpp.enviar("🤖 Opened.!")
            break

            
          case 'abrirgp':
            if(!isGroup) return wpp.enviar('🤖 Apenas em grupo, amigo.')
            if(!isAdmin) return wpp.enviar('🤖 Membro comum detectado, você não pode utilizar esse comando.')
            if(!isBotAdmin) return wpp.enviar('🤖 É necessário que eu seja admin.')

            settingGrp.updateSettingsGroup("fechar")
            wpp.enviar("🤖 Closed.!")
            break

            
          case 'antilink':
            if(!isGroup) return wpp.enviar('🤖 Apenas em grupo, amigo.')
            if(!isAdmin) return wpp.enviar('🤖 Membro comum detectado, você não pode utilizar esse comando.')
            if(!isBotAdmin) return wpp.enviar('🤖 É necessário que eu seja admin.')

            power = arg.toLowerCase()

            if(!power) return wpp.enviar('🤖 Ative ou desative o comando antilink no grupo. Use: \n'+ prefix +'antilink on\n'+ prefix +'antilink off \n\n*Obs:* Se ativado, ao ser enviado um link por um usuário comum eu o removerei do grp.')

            switch(power){
              case 'on':
                configActivators.antilink = true;
                fs.writeFileSync('./data/actives-cmd/activator.json', JSON.stringify(configActivators, null, 2));
                wpp.enviar("🤖 Antilink ON.")
                break 
              case 'off':
                configActivators.antilink = false;
                fs.writeFileSync('./data/actives-cmd/activator.json', JSON.stringify(configActivators, null, 2));
                wpp.enviar("🤖 Antilink OFF.")
                break
             default:
                wpp.enviar('🤖 Ops...\n\nUse apenas *"on"* ou *"off"* como parâmetro.\n\n Antilink: '+antilink)
            }
            
            break


          case 'boasvindas': case 'bemvindo': case 'welcome':
            if(!isGroup) return wpp.enviar('🤖 Apenas em grupo, amigo.')
            if(!isAdmin) return wpp.enviar('🤖 Membro comum detectado, você não pode utilizar esse comando.')
            if(!isBotAdmin) return wpp.enviar('🤖 É necessário que eu seja admin.')

            power = arg.toLowerCase()

            if(!power) return wpp.enviar('🤖 Ative ou desative o comando boasvindas no grupo. Use: \n'+ prefix +'bemvindo on\n'+ prefix +'boasvindas off \n\n*Obs:* Se ativado, eu darei boas vindas aos novos usuários.')

            switch(power){
              case 'on':
                configActivators.boasvindas = true;
                fs.writeFileSync('./data/actives-cmd/activator.json', JSON.stringify(configActivators, null, 2));
                wpp.enviar("🤖 boas-vindas ON.")
                break 
              case 'off':
                configActivators.boasvindas = false;
                fs.writeFileSync('./data/actives-cmd/activator.json', JSON.stringify(configActivators, null, 2));
                wpp.enviar("🤖 boas-vindas OFF.")
                break
             default:
                wpp.enviar('🤖 Ops...\n\nUse apenas *"on"* ou *"off"* como parâmetro.\n\n boasvindas: '+antilink)
            }
            
            break
            
          case 'mudarprefixo':
            if(!isGroup)  return wpp.enviar(`🤖 Devido a atualizações da API do meu programa, este comando só funcionará em grupos.`)
            if(!isOwner) return wpp.enviar(`🤖 Apenas o meu dono ${nomeDono} pode usar esse comando`)

            p = arg

            if(!p) return wpp.enviar('🤖 Mestre, envie um caracter junto para um novo prefixo\n\nEx.: '+prefix+'mudarprefixo #')
            
            config.prefixo = p
            prefix = p
            
            fs.writeFileSync('./data/dono/dono.json', JSON.stringify(config, null, 2));
            
            wpp.enviar(`🤖 Novo prefixo para o meu uso. \nTeste: ${prefix}menu`)
            break 

            
          case 'mudarnomebot':
            if(!isGroup)  return wpp.enviar(`🤖 Devido a atualizações da API do meu programa, este comando só funcionará em grupos.`)
            if(!isOwner) return wpp.enviar(`🤖 Apenas o meu dono ${nomeDono} pode usar esse comando`)

            n = arg

            if(!n) return wpp.enviar('🤖 Mestre, envie um nick junto para o meu novo nome\n\nEx.: '+prefix+'mudarnomebot ZecBot')
            
            config.nomeBot = n
            nomeBot = n
            
            fs.writeFileSync('./data/dono/dono.json', JSON.stringify(config, null, 2));
            
            wpp.enviar(`🤖 Opan, agora eu me chamo ${n}`)
            break 

                               
          case 'mudarnomedono':
            if(!isGroup)  return wpp.enviar(`🤖 Devido a atualizações da API do meu programa, este comando só funcionará em grupos.`)
            if(!isOwner) return wpp.enviar(`🤖 Apenas o meu dono ${nomeDono} pode usar esse comando`)

            n = arg

            if(!n) return wpp.enviar('🤖 Mestre, envie um nick junto para o novo nome\n\nEx.: '+prefix+'mudarnomedono Cleitin')
            
            config.nomeDono = n
            nomeDono = n
            
            fs.writeFileSync('./data/dono/dono.json', JSON.stringify(config, null, 2));
            
            wpp.enviar(`🤖 Opan, agora vc se chama ${n}`)
            break 

            
          case 'mudarcttdono':
            if(!isGroup)  return wpp.enviar(`🤖 Devido a atualizações da API do meu programa, este comando só funcionará em grupos.`)
            if(!isOwner) return wpp.enviar(`🤖 Apenas o meu dono ${nomeDono} pode usar esse comando`)

            n = arg

            if(!n) return wpp.enviar('🤖 Mestre, envie um numero junto para o novo numero dono\n\nEx.: '+prefix+'mudarcttdono 559883528066 (use esse formato!!)\n\nObs: Cuidado, se você botar o número incorreto, o ctt errado vai ser o dono e vc não poderá usar esse cmd novamente. (Se acontecer, modifique o número manualmente no diretório dono no bot)')
            
            config.numeroDono = n
            numeroDono = n
            
            fs.writeFileSync('./data/dono/dono.json', JSON.stringify(config, null, 2));
            
            wpp.enviar(`🤖 O número de ${pushName} não está mais cadastrado como meu dono.\n\n Contato do novo dono: wa.me//${n}.\nSe vc se arrependeu da operação vá ao bot e edita o número dono no diretório dono.`)
            break 
            
            
          case 'mudarimgmenu':
            if(!isGroup)  return wpp.enviar(`🤖 Devido a atualizações da API do meu programa, este comando só funcionará em grupos.`)
            if(!isOwner) return wpp.enviar(`🤖 Apenas o meu dono ${nomeDono} pode usar esse comando`)

            n = arg

            if(!n) return wpp.enviar('🤖 Mestre, envie um link de uma img junto para o novo banner\n\nEx.: '+prefix+'mudarimgmenu https://exemplo.link/imagem.jpg')
            
            configUrl.menu = n
            imageMenu = n

            if(!n.includes('https://')) return wpp.enviar('Isso é um Link msm?')
            fs.writeFileSync('./data/media/img-url/urls.json', JSON.stringify(configUrl, null, 2));
            
            wpp.enviar(`🤖 Certifique-se de que a url é válido.\nVeja se alterou -> ${prefix}menu.`)
            break 

            
          case 'marcar':
            if(!isGroup) return enviar("🤖 Comando para usar em grupos...")
            if(!isAdmin) return enviar('🤖 Esse comando é para os Adms.')
            
            marcarMsg = arg
    
            if(!marcarMsg) return wpp.enviar("🤖 Você precisa mandar uma mensagem junto\n\nEx: "+prefix+"marcar Olá galera, Bot On")
            
            await bot.sendMessage(from, { text: marcarMsg, mentions: listMembersGroupID })
            
            break 
          case 'perfil':
            if(!isGroup) return wpp.enviar('🤖 Apenas em um grupo.')
            
            recado = await bot.fetchStatus(participant)
            imgPerfilUrl = await bot.profilePictureUrl(participant)
            nome = pushName

            msg = `🤖 *Perfil Básico*\n\n*Nome:* ${nome}\n\n*Recado*: ${recado.status}`
            wpp.enviarImagem(imgPerfilUrl, msg)
            
            break
          default:
            wpp.reagir('❌')
        }
      }
    } catch(error){
      console.log('Ocorreu alguma falha ao receber a mensagem. Mas vamos Proceguir...')
      console.log(error)
    }
    
  })
  
}

console.log('Compilado')
startBot();








