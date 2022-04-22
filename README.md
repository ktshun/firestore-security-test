# firestore-security-test
## How to run test

1. Firebaseエミュレータの起動
```bash
## 初期設定（既に終わっている場合は不要）
$ npm install -g firebase-tools
$ firebase init　#　firestoreを選択し、Projectは適当なものを選ぶ
$ firebase setup:emulators:firestore
## エミュレータ起動
$ firebase emulators:start
```

2. UT実行
```bash
$ yarn test
```
