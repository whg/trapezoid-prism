#include "FastLED.h"
#include "Receiver.hpp"

#define DATA_PIN 7

Receiver receiver;

void setup() {
  FastLED.addLeds<WS2812, DATA_PIN, GRB>(leds, NUM_LEDS);
  Serial.begin(115200);
}

void loop() {
  receiver.receive();
  FastLED.show();
}
