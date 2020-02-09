#! /bin/bash

AVATARS=AvatarNameRegistry.sol
DCLREGISTRAR=DCLRegistrar.sol
DCLSTANDARDCONTROLLER=DCLStandardController.sol
DCLCOMMITANDREVEALCONTROLLER=DCLCommitAndRevealController.sol


OUTPUT=full

npx truffle-flattener contracts/oldNameRegistry/$AVATARS > $OUTPUT/$AVATARS &&
npx truffle-flattener contracts/ens/$DCLREGISTRAR > $OUTPUT/$DCLREGISTRAR &&
npx truffle-flattener contracts/ens/$DCLSTANDARDCONTROLLER > $OUTPUT/$DCLSTANDARDCONTROLLER
npx truffle-flattener contracts/ens/$DCLCOMMITANDREVEALCONTROLLER > $OUTPUT/$DCLCOMMITANDREVEALCONTROLLER