import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = createClient({
    url: REDIS_URL
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
    try {
        await redisClient.connect();
        console.log('Successfully connected to Redis.');
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
    }
})();

export default redisClient;
