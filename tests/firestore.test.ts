// @ts-ignore
import * as firebase from "@firebase/rules-unit-testing";
import * as fs from "fs";
import {v4} from "uuid";
import {serverTimestamp as st} from 'firebase/firestore'

const serverTimestamp = () => st()
const projectId = "ktshun-test"
const expertUserId = "expert-user-id"
const clientUserId = "client-user-id"
const unpaidRoomId = "unpaid-room"
const paidRoomId = "paid-room"
let testEnv: firebase.RulesTestEnvironment

beforeAll(async () => {
  testEnv = await firebase.initializeTestEnvironment({
    projectId: projectId,
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8"),
      host: "localhost",
      port: 8080
    }
  })
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

afterAll(async () => {
  await testEnv.cleanup()
})

async function initData() {
  await testEnv.withSecurityRulesDisabled(async context => {
    const firestore = context.firestore()
    // 未開放Room
    await firestore.collection('rooms').doc(unpaidRoomId).set({
      members: [expertUserId, clientUserId],
      visibility: "only-client",
    })
    await firestore.collection('rooms').doc(unpaidRoomId)
      .collection('messages').doc(v4()).set({
        from: clientUserId,
        body: "Hello, world.",
        sentAt: serverTimestamp()
      })
    // 解放済みRoom
    await firestore.collection('rooms').doc(paidRoomId).set({
      members: [expertUserId, clientUserId],
      visibility: "all",
    })
    await firestore.collection('rooms').doc(paidRoomId)
      .collection('messages').doc(v4()).set({
        from: clientUserId,
        body: "Hello, world.",
        sentAt: serverTimestamp()
      })
    // ClientUser
    await firestore.collection('users').doc(clientUserId).set({
      type: "CLIENT"
    })
    // ExpertUser
    await firestore.collection('users').doc(expertUserId).set({
      type: "EXPERT"
    })
  })
}


describe("chatroom security", () => {
  it("Client can check own room", async () => {
    await initData()
    const context = await testEnv.authenticatedContext(clientUserId)
    const rooms = await context.firestore().collection('rooms')
      .where("members", "array-contains", clientUserId).get()
    expect(rooms.size).toBe(2)
  });

  it("Expert can check own room", async () => {
    await initData()
    const context = await testEnv.authenticatedContext(expertUserId)
    const rooms = await context.firestore().collection('rooms')
      .where("members", "array-contains", expertUserId).get()
    expect(rooms.size).toBe(2)
  });

  it("Client can NOT check others chat", async () => {
    await initData()
    const otherClientId = "other-client-id"
    const context = await testEnv.authenticatedContext(otherClientId)
    await firebase.assertFails(
      context.firestore().collection('rooms')
        .where("members", "array-contains", clientUserId).get()
    )
  });

  it("Client can check unpaid room message", async () => {
    await initData()
    const context = await testEnv.authenticatedContext(clientUserId)
    const messages = await context.firestore().collection('rooms').doc(unpaidRoomId)
      .collection('messages').get()
    expect(messages.size).toBe(1)
  });

  it("Client can check paid room message", async () => {
    await initData()
    const context = await testEnv.authenticatedContext(clientUserId)
    const messages = await context.firestore().collection('rooms').doc(paidRoomId)
      .collection('messages').get()
    expect(messages.size).toBe(1)
  });

  it("Expert can NOT check unpaid room message", async () => {
    await initData()
    const context = await testEnv.authenticatedContext(expertUserId)
    await firebase.assertFails(
      context.firestore().collection('rooms').doc(unpaidRoomId)
        .collection('messages').get()
    )
  });

  it("Expert can check paid room message", async () => {
    await initData()
    const context = await testEnv.authenticatedContext(expertUserId)
    const messages = await context.firestore().collection('rooms').doc(paidRoomId)
      .collection('messages').get()
    expect(messages.size).toBe(1)
  });
})
;