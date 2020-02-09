#! /bin/bash

AVATARS=AvatarNameRegistry.sol
DCLREGISTRAR=DCLRegistrar.sol
DCLCONTROLLER=DCLStandardController.sol


OUTPUT=full

npx truffle-flattener contracts/oldNameRegistry/$AVATARS > $OUTPUT/$AVATARS &&
npx truffle-flattener contracts/ens/$DCLREGISTRAR > $OUTPUT/$DCLREGISTRAR &&
npx truffle-flattener contracts/ens/$DCLCONTROLLER > $OUTPUT/$DCLCONTROLLER