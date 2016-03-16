#include "FastLED.h"

#define NUM_LEDS 64
#define DATA_PIN 7

#define DATA_LENGTH (NUM_LEDS * 3)
#define MESSAGE_LENGTH (NUM_LEDS * 3 + 1) //64 * 3 + 1
#define CHECKSUM_INDEX (NUM_LEDS * 3)

CRGB leds[NUM_LEDS];

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
            continue;
          }
          else if (incoming == ETX) {
            if (dataPosition == MESSAGE_LENGTH) {
              mode = ENDED;
            }
          }

          if (dataPosition >= MESSAGE_LENGTH && mode != ENDED) {
            dataPosition = 0;
            continue;
          }

          if (mode == READING) {
            data[dataPosition++] = incoming;
          }
          else if (mode == ENDED) {
           
            // make sure the checksum is correct
            uint16_t sum = 0;
            for (int i = 0; i < DATA_LENGTH; i++) {
              sum += data[i];
            }
            uint8_t checksum = sum % 255;

            if (data[CHECKSUM_INDEX] != checksum) {
              continue;
            }

            uint8_t *ledsPointer = reinterpret_cast<uint8_t*>(&leds[0]);
            for (int i = 0; i < DATA_LENGTH; i++) {
              ledsPointer[i] = data[i];
            }
            mode = WAITING;
            dataPosition = 0;
            break;
          }
        }
      }
    }

};

void setup() {
//  FastLED.addLeds<TM1809, DATA_PIN, BRG>(leds, NUM_LEDS);
//  FastLED.addLeds<WS2812, DATA_PIN, BRG>(leds, NUM_LEDS);
  FastLED.addLeds<WS2812, DATA_PIN, GRB>(leds, NUM_LEDS);
  Serial.begin(57600);
}

int ledOn = 0;
int counter = 1;


Receiver receiver;


void loop() {

  //  checkMidiIn();
  
  receiver.receive();

  FastLED.show();
}

const int NOTE_ON = 0b1001;
const int NOTE_OFF = 0b1000;

typedef enum {
  PITCH,
  VELOCITY,
} WaitingFor;

void checkMidiIn() {
  static byte pitch, velocity, staytus, channel;
  static byte incoming = 0;
  static WaitingFor waitingFor;



  if (Serial.available()) {

    incoming = Serial.read();
    //  leds[0].r = incoming * 2;
    //    Serial.write(incoming);
    //    return;

    if (incoming & 128) { // check the status bit
      staytus = (incoming >> 4) & 0x0F;
      channel = incoming & 0x0F;
      waitingFor = PITCH;
    }
    else {
      if (waitingFor == PITCH) {
        pitch = incoming;
        waitingFor = VELOCITY;
      }
      else if (waitingFor == VELOCITY) {
        velocity = incoming;
        waitingFor = PITCH;

        if (staytus == NOTE_ON) {
          activateMIDI(pitch, velocity);
        }
        else if (staytus == NOTE_OFF) {
          activateMIDI(pitch, 0);
        }
      }

    }

  }//if available

}

void activateMIDI(int pitch, int velocity) {
  leds[0].r = velocity * 2;
}

