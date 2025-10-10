import torch
import argparse
import numpy
import numpy.dtypes
torch.serialization.add_safe_globals([
    argparse.Namespace,
    numpy.core.multiarray._reconstruct,
    numpy.ndarray,
    numpy.dtype,
    numpy.dtypes.Float64DType
])

import pika
import os
import json
import time
import threading

# Import the analysis function
from admet.pipeline import run_analysis_pipeline

RABBITMQ_URL = os.environ.get('CELERY_BROKER_URL', 'amqp://user:password@rabbitmq:5672//')
TASK_QUEUE = 'admet_tasks'

def main():
    connection = None
    while True:
        try:
            print('Connecting to RabbitMQ...')
            connection = pika.BlockingConnection(pika.URLParameters(RABBITMQ_URL))
            channel = connection.channel()

            channel.queue_declare(queue=TASK_QUEUE, durable=True)
            print(f'[*] Waiting for messages in {TASK_QUEUE}. To exit press CTRL+C')

            def callback(ch, method, properties, body):
                print(f" [x] Received task from queue")
                try:
                    task_data = json.loads(body)
                    
                    # We need to run the analysis in a separate thread because it's a long-running CPU-bound task.
                    # pika's blocking connection is not thread-safe for acknowledgement across threads,
                    # so we handle acknowledgement carefully.
                    
                    def do_work(ch, method, properties, body):
                        try:
                            run_analysis_pipeline(
                                name=task_data.get('name'),
                                smiles=task_data.get('smiles'),
                                session_id=task_data.get('sessionId'),
                                identifier=task_data.get('identifier'),
                                type=task_data.get('type'),
                                selected_parameters=task_data.get('selected_parameters') # Pass selected parameters
                            )
                        except Exception as e:
                            print(f"Error during analysis: {e}")
                        finally:
                            # Acknowledge the message from the main thread
                            connection.add_callback_threadsafe(lambda: ch.basic_ack(delivery_tag=method.delivery_tag))
                            print(f" [x] Done and acknowledged task")

                    # Start the work in a new thread
                    worker_thread = threading.Thread(target=do_work, args=(ch, method, properties, body))
                    worker_thread.start()

                except json.JSONDecodeError as e:
                    print(f"Could not decode JSON from message: {e}")
                    ch.basic_ack(delivery_tag=method.delivery_tag) # Acknowledge malformed message to avoid requeue
                except Exception as e:
                    print(f"An unexpected error occurred in callback: {e}")
                    ch.basic_ack(delivery_tag=method.delivery_tag)

            channel.basic_qos(prefetch_count=1) # Process one message at a time
            channel.basic_consume(queue=TASK_QUEUE, on_message_callback=callback, auto_ack=False)

            channel.start_consuming()

        except pika.exceptions.AMQPConnectionError as e:
            print(f"Connection to RabbitMQ failed: {e}. Retrying in 5 seconds...")
            if connection and not connection.is_closed:
                connection.close()
            time.sleep(5)
        except Exception as e:
            print(f"An unexpected error occurred: {e}. Restarting consumer in 10 seconds...")
            if connection and not connection.is_closed:
                connection.close()
            time.sleep(10)

if __name__ == '__main__':
    main()
