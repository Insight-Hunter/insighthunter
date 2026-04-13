export default {
  async queue(batch: MessageBatch<any>) {
    for (const message of batch.messages) {
      console.log('reminder placeholder', message.body);
      message.ack();
    }
  }
};
