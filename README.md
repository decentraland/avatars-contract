# Decentraland Sub domains Contract

## Contracts related

### Mainnet

- ENS Registry = `0x314159265dd8dbb310642f98f50c066173c1259b`
- ENS Public Resolver = `0x226159d592E2b063810a10Ebf6dcbADA94Ed68b8`
- ENS Base Registrar = `0xfac7bea255a6990f749363002136af6556b31e04`
- ENS Registrar Controller = `0xb22c1c159d12461ea124b0deb4b5b93020e6ad16`

### Ropsten

- ENS Registry = `0x112234455c3a32fd11230c42e7bccd4a84e02010`
- ENS Public Resolver = `0x12299799a50340fb860d276805e78550cbad3de3`
- ENS Base Registrar = `0x227fcb6ddf14880413ef4f1a3df2bbb32bcb29d7`

## Renew `dcl`

Call `nameExpires` method at **ENS Base Registrar** contract to check whether `dcl` domain is close to expire.

If it is about to expire, you can call `renew` method from **ENS Registrar Controller**. This method is `payable` so you should send Ether when calling it.
The Ether you send is related to the amount of time to renew the ENS domain.
