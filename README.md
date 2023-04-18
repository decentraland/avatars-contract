# Decentraland subdomains Contract

## Contracts related

### Mainnet

## Update 04/04/2023

- DCLControllerV2 = `0xbe92b49aee993adea3a002adcda189a2b7dec56c`

## Update 07/10/2020

- ENS Public Resolver = `0x4976fb03c32e5b8cfe2b6ccb31c09ba78ebaba41` 

### [New 29/01/2020](https://medium.com/the-ethereum-name-service/ens-registry-migration-bug-fix-new-features-64379193a5a)

- ENS Registry = `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e`
- ENS Public Resolver = `0xDaaF96c344f63131acadD0Ea35170E7892d3dfBA`
- ENS Base Registrar = `0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85`
- ENS Registrar Controller = _`undefined yet after migration has finished`_

### Old

- ENS Registry = `0x314159265dd8dbb310642f98f50c066173c1259b`
- ENS Public Resolver = `0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8`
- ENS Base Registrar = `0xfac7bea255a6990f749363002136af6556b31e04`
- ENS Registrar Controller = `0xb22c1c159d12461ea124b0deb4b5b93020e6ad16`

### Goerli

- DCLControllerV2 - `0xe23b047c8ee33d0c423676544bca6d2c9d3faa49`

### Ropsten

- ENS Registry = `0x112234455c3a32fd11230c42e7bccd4a84e02010`
- ENS Public Resolver = `0x12299799a50340fb860d276805e78550cbad3de3`
- ENS Base Registrar = `0x227fcb6ddf14880413ef4f1a3df2bbb32bcb29d7`

### Renew `dcl`

Call `nameExpires` method at **ENS Base Registrar** contract to check whether `dcl` domain is close to expire.

If it is about to expire, you can call `renew` method from **ENS Registrar Controller**. This method is `payable` so you should send Ether when calling it.
The Ether you send is related to the amount of time to renew the ENS domain.
