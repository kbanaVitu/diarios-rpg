# 📖 Diários de RPG

🎲 Site estático para eternizar as aventuras dos personagens das nossas mesas de RPG.  
Cada entrada é escrita do ponto de vista dos personagens, criando um verdadeiro diário de campanha.

---

## 🧭 Como funciona!

O site organiza os diários em três níveis:

- **Mestre** 🧙
  - **Campanha** 🗺️
    - **Personagem** 🧍‍♀️

Cada personagem tem seu próprio diário, que pode ser visualizado em uma interface simples e acessível.

---

## 🚧 Implementações Futuras

O objetivo é permitir que **qualquer jogador adicione ou atualize seu diário** sem precisar alterar o código fonte.  
Para isso, o projeto terá um backend leve com integração ao **Firebase**, seguindo o fluxo:

1.  Jogador envia um novo texto (via formulário no site)  
2.  O frontend envia a requisição para o backend  
3.  O backend comunica com o **Firebase Datastore**  
4.  O dado atualizado é tratado e renderizado diretamente na tela  

Isso tornará o sistema colaborativo e sustentável a longo prazo. Sem necessidade de mexer no repositório ou depender de um dev.



> “Não são apenas histórias, são memórias vivas que merecem ser contadas.” 🗡️📜✨
