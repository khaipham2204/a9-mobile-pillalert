import { Modal, Pressable, ScrollView, Text, View } from "react-native";

interface DisclaimerModalProps {
  visible: boolean;
  onAgree: () => void;
}

export function DisclaimerModal({ visible, onAgree }: DisclaimerModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View className="flex-1 items-center justify-center bg-black/60 px-5">
        <View className="w-full max-w-md overflow-hidden rounded-lg bg-white">
          {/* Header */}
          <View className="bg-gray-600 px-5 py-4">
            <Text className="text-lg font-bold text-white">DISCLAIMER</Text>
          </View>

          {/* Content */}
          <ScrollView className="max-h-[65vh] px-5 py-5">
            <Text className="text-sm leading-6 text-gray-700">
              The information provided by Pill Alert (&quot;We&quot;,
              &quot;Us&quot;, or &quot;Our&quot;) on our mobile application is
              for general information purposes only. All information on our
              mobile application is provided in good faith, however we make no
              representation or warranty of any kind, express or implied,
              regarding the accuracy, adequacy, validity, reliability,
              availability, or completeness of any information on our mobile
              application.
              {"\n\n"}
              UNDER NO CIRCUMSTANCE SHALL WE HAVE ANY LIABILITY TO YOU FOR ANY
              LOSS OR DAMAGE OF ANY KIND INCURRED AS A RESULT OF THE USE OF OUR
              MOBILE APPLICATION OR ANY RELIANCE ON ANY INFORMATION PROVIDED ON
              OUR MOBILE APPLICATION.
              {"\n\n"}
              YOUR USE OF OUR MOBILE APPLICATION AND YOUR RELIANCE ON ANY
              INFORMATION ON OUR APPLICATION IS SOLELY AT YOUR OWN RISK.
            </Text>
          </ScrollView>

          {/* Footer */}
          <View className="border-t border-gray-200 px-5 py-4">
            <Pressable
              onPress={onAgree}
              className="self-start rounded-md bg-gray-200 px-5 py-2.5 active:bg-gray-300"
            >
              <Text className="font-semibold text-gray-900">I agree</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
