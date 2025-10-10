import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://user:password@localhost:5672';
const TASK_QUEUE = 'admet_tasks';

let channel = null;

export const connectQueue = async () => {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        await channel.assertQueue(TASK_QUEUE, { durable: true });
        console.log('Successfully connected to RabbitMQ and asserted queue.');
    } catch (error) {
        console.error('Failed to connect to RabbitMQ:', error);
        // Keep trying to reconnect
        setTimeout(connectQueue, 5000);
    }
};

export const sendTaskToQueue = (task) => {
    if (!channel) {
        console.error('RabbitMQ channel is not available.');
        throw new Error('Cannot send task to queue: channel is not available.');
    }
    channel.sendToQueue(TASK_QUEUE, Buffer.from(JSON.stringify(task)), { 
        persistent: true,
        contentType: 'application/json'
    });
    console.log(`Task sent to queue: ${JSON.stringify(task)}`);
};
