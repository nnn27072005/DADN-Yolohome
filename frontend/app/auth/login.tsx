import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
  Platform,
} from "react-native";
import { router, Link } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { apiCall } from "@/utils/apiCall";
import { useAuth } from "@/contexts/AuthContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { setAuthData } = useAuth();
  const passwordInputRef = useRef<TextInput>(null);

  const handleLogin = () => {
    login();
  };

  const { mutate: login } = useMutation({
    mutationFn: async () => {
      const response = await apiCall({
        method: "POST",
        endpoint: "/login",
        body: {
          username,
          password,
        },
      });
      return response;
    },
    onSuccess: async (data) => {
      await setAuthData(data.token, data.username, data.fullname);
      router.replace("/(tabs)");
    },
    onError: (error) => {
      alert("Lỗi đăng nhập: " + error.message);
    },
  });

  return (
    <ImageBackground
      source={require("../../assets/images/yolohome-login-bg.png")}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIconBox}>
            <MaterialCommunityIcons name="transit-connection-variant" size={32} color="#FF9500" />
          </View>
          <Text style={styles.logoTitle}>
            Yolo<Text style={{ color: "#FF9500" }}>home</Text>
          </Text>
        </View>

        {/* Simplified Login Frame */}
        <View style={styles.card}>
          <Text style={styles.welcomeText}>Đăng nhập</Text>

          {/* Username Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tên đăng nhập</Text>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="account-outline" size={20} color="#1A1A2E" style={styles.inputIcon} />
              <TextInput
                placeholder="Nhập tên đăng nhập"
                placeholderTextColor="#A0A0B0"
                value={username}
                onChangeText={setUsername}
                style={styles.input}
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Mật khẩu</Text>
              <TouchableOpacity>
                <Text style={styles.recoverText}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputWrapper}>
              <MaterialCommunityIcons name="lock-outline" size={20} color="#1A1A2E" style={styles.inputIcon} />
              <TextInput
                ref={passwordInputRef}
                placeholder="Nhập mật khẩu"
                placeholderTextColor="#A0A0B0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={[styles.input, { flex: 1 }]}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <MaterialCommunityIcons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#1A1A2E"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Remember Me */}
          <TouchableOpacity 
            style={styles.checkboxRow} 
            onPress={() => setRememberMe(!rememberMe)}
          >
            <MaterialCommunityIcons 
              name={rememberMe ? "checkbox-marked" : "checkbox-blank-outline"} 
              size={18} 
              color={rememberMe ? "#FF9500" : "#A0A0B0"} 
            />
            <Text style={styles.checkboxLabel}>Ghi nhớ đăng nhập</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
            <Text style={styles.primaryButtonText}>Đăng nhập</Text>
          </TouchableOpacity>

          <Text style={styles.footerLinkText}>
            Chưa có tài khoản?{" "}
            <Link href="/auth/signup" style={styles.signupLink}>
              Đăng ký ngay
            </Link>
          </Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    height: "100%",
    width: "100%",
  },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoIconBox: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 149, 0, 0.3)",
    backgroundColor: "rgba(255, 149, 0, 0.05)",
    marginBottom: 10,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1A1A2E",
    letterSpacing: 1,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "rgba(26, 26, 46, 0.95)",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 24,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#A0A0B0",
    marginBottom: 8,
  },
  recoverText: {
    fontSize: 11,
    color: "#FF9500",
    fontWeight: "500",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    marginTop: 4,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#1A1A2E",
    fontSize: 14,
    fontWeight: "500",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  checkboxLabel: {
    fontSize: 13,
    color: "#A0A0B0",
    marginLeft: 8,
  },
  primaryButton: {
    backgroundColor: "#FF8C00",
    borderRadius: 10,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  footerLinkText: {
    fontSize: 14,
    color: "#A0A0B0",
    textAlign: "center",
  },
  signupLink: {
    color: "#FF9500",
    fontWeight: "bold",
  },
});
