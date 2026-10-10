# Revisão de dependências — 9 de outubro de 2026

Escopo: frontend Node publicado no Render, na pasta `frontend` do repositório. Os números abaixo são os resultados de `npm audit` após uma instalação limpa com `npm ci --include=dev`. O relatório conta pacotes afetados, não vulnerabilidades independentes.

| Auditoria | Críticos | Altos | Moderados | Baixos |
| --- | ---: | ---: | ---: | ---: |
| Todas as dependências | 0 | 11 | 3 | 0 |
| Dependências de produção (`--omit=dev`) | 0 | 6 | 3 | 0 |

Foram atualizados React/React DOM/React Server DOM de 19.2.6 para 19.2.8, Vinext para 1.1.0, Vite para 8.3.4 e os pacotes compatíveis de build. `proxy-addr` foi resolvido em 2.0.8, eliminando o alerta crítico de [falsificação de IP](https://github.com/advisories/GHSA-jqcg-44mw-7w3h). O React Server DOM 19.2.8 corrige a [negação de serviço em Server Functions](https://github.com/advisories/GHSA-wx67-qw84-cm4g). O CLI `shadcn`, necessário apenas para construir o CSS, foi movido para dependências de desenvolvimento. Pacotes Cloudflare/Sites não usados no serviço Render foram retirados desse checkout.

Os seis alertas altos remanescentes na auditoria de produção formam uma cadeia transitiva de ferramentas de glob usada pelo Vinext: `vinext → vite-plugin-commonjs → vite-plugin-dynamic-import → fast-glob → micromatch → braces`. O pacote `braces` não tinha uma versão corrigida publicada nesta revisão; `npm audit fix --force` propôs trocar Vinext por 0.2.1, uma regressão de versão incompatível com esta aplicação. Não aplicamos essa troca. Os três alertas moderados são a cadeia `@vercel/og → satori → fflate`; a demo não implementa geração de imagens OG, mas os pacotes continuam presentes como dependências do Vinext.

Isso reduz a exposição conhecida, mas **não equivale a uma auditoria de segurança completa** nem a zero alertas. Reavaliar ao surgir uma correção do Vinext ou dos pacotes transitivos; antes de usar dados reais, revisar também autenticação, configuração de produção e testes de segurança.
