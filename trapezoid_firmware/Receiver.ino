//#define DATA_LENGTH (NUM_LEDS * 3)
//#define MESSAGE_LENGTH (NUM_LEDS * 3 + 1) //64 * 3 + 1
//#define CHECKSUM_INDEX (NUM_LEDS * 3 - 2)
//
//
//class Receiver {
//  public:
//    uint8_t data[256];
//    uint8_t dataPosition;
//    uint8_t incoming;
//
//    enum {
//      STX = 23,
//      ETX = 24,
//    };
//
//    enum mode_t { WAITING, READING, ENDED };
//    mode_t mode;
//
//    Receiver(): dataPosition(0), mode(WAITING) { }
//
//    void receive() {
//      while (Serial.available()) {
//        incoming = Serial.read();
//
//        if (incoming == STX) {
//          mode = READING;
//          break;
//        }
//        else if (incoming == ETX) {
//          mode = ENDED;
//        }
//
//        if (mode == READING) {
//          data[dataPosition++] = incoming;
//        }
//        else if (mode == ENDED) {
//          // make sure the data is the right length
//          if (dataPosition != MESSAGE_LENGTH) {
//            mode = WAITING;
//            break;
//          }
//
//          // make sure the checksum is correct
//          uint16_t sum = 0;
//          for (int i = 0; i < DATA_LENGTH; i++) {
//            sum += data[i];
//          }
//          uint8_t checksum = sum % 255;
//
//          if (data[CHECKSUM_INDEX] != checksum) {
//            break;
//          }
//
//          // do your thing
//
//          uint8_t *ledsPointer = reinterpret_cast<uint8_t*>(&leds[0]);
//          for (int i = 0; i < DATA_LENGTH; i++) {
//            ledsPointer[i] = data[i];
//          }
//          mode = WAITING;
//        }
//      }
//    }
//
//};
