export default {
  async queue(batch: MessageBatch<any>) {
    for (const message of batch.messages) {
      console.log('document render placeholder', message.body);
      message.ack();
    }
  }
};
