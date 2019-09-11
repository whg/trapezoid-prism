#include "Arduino.h"

#define NUM_LEDS 64

#define DATA_LENGTH (NUM_LEDS * 3)
#define MESSAGE_LENGTH (NUM_LEDS * 3 + 1) //64 * 3 + 1
#define CHECKSUM_INDEX (NUM_LEDS * 3)

CRGB leds[NUM_LEDS];

//#define DEBUG 1
#define START 1
#define END 2
#define OVERRUN 11
#define CHECKSUMFAIL 12
#define SUCCESS 3

uint16_t endIndex = 0;

class Receiver {
  public:
    uint8_t data[256];
    uint8_t dataPosition;
    uint8_t incoming;

    enum {
      STX = 23,
      ETX = 24,
    };

    enum mode_t { WAITING, READING, ENDED };
    mode_t mode;

    Receiver(): dataPosition(0), mode(WAITING) { }

    void receive() {
      while (true) {
        if (Serial.available()) {
          incoming = Serial.read();

          if (incoming == STX && mode != READING) {
            mode = READING;
            #ifdef DEBUG
            Serial.write(START);
            #endif
            continue;
          }
          else if (incoming == ETX) {
            if (dataPosition == MESSAGE_LENGTH) {
              mode = ENDED;
              #ifdef DEBUG
              Serial.write(END);
              #endif
            }
            endIndex = dataPosition;
          }

          // reset position if we've overrun
          if (dataPosition > MESSAGE_LENGTH && mode != ENDED) {
            dataPosition = 0;
			mode = WAITING;
            #ifdef DEBUG
            Serial.write(OVERRUN);
            Serial.write(endIndex);
            #endif
            continue;
          }

          if (mode == READING) {
            data[dataPosition++] = incoming;
          }
          else if (mode == ENDED) {
           
            uint8_t *ledsPointer = reinterpret_cast<uint8_t*>(&leds[0]);
            for (int i = 0; i < DATA_LENGTH; i++) {
              ledsPointer[i] = data[i];
            }
            mode = WAITING;
            dataPosition = 0;
            #ifdef DEBUG
            Serial.write(SUCCESS);
            #endif
            break;
          }
        }
      }
    }
};
