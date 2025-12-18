import pika
import os
import json
import time
import threading
import requests # Import requests

# Import from lightweight module that doesn't load ADMET models
from .notifications import notify_backend

RABBITMQ_URL = os.environ.get('CELERY_BROKER_URL', 'amqp://user:password@localhost:5672/')
TASK_QUEUE = 'admet_tasks'
ADMET_API_URL = os.environ.get('ADMET_API_URL', 'http://localhost:8000') # URL for the FastAPI app

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
                    
                    def do_work(ch, method, properties, body):
                        task_result = None
                        status = "success"
                        try:
                            # Call the FastAPI endpoint
                            print(f"Calling ADMET API at {ADMET_API_URL}/predict")
                            api_response = requests.post(
                                f"{ADMET_API_URL}/predict",
                                json={
                                    "name": task_data.get('name'),
                                    "smiles": task_data.get('smiles'),
                                    "selected_parameters": task_data.get('selected_parameters')
                                }
                            )
                            api_response.raise_for_status() # Raise an exception for bad status codes
                            task_result = api_response.json()

                        except Exception as e:
                            print(f"Error during analysis API call: {e}")
                            status = "error"
                            task_result = {"error": f"Analysis failed: {e}"}
                        
                        # Notify the backend with the result from the API
                        notification_payload = {
                            "sessionId": task_data.get('sessionId'),
                            "status": status,
                            "data": task_result,
                            "type": task_data.get('type'),
                            "identifier": task_data.get('identifier'),
                            "selected_parameters": task_data.get('selected_parameters') # Pass parameters to backend
                        }
                        notify_backend(notification_payload)

                        # Acknowledge the message
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
